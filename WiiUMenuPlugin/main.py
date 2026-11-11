import asyncio
import json
import os
import re
import time

import aiohttp
import decky


CDP_BASE = "http://127.0.0.1:8080"

ROUTE_EXPR = (
    "(()=>{try{return window.SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance"
    "?.m_locationPathname||''}catch(e){return ''}})()"
)

SHARED_STATE_EXPR = (
    "(async()=>{try{const w=SteamUIStore.WindowStore.GamepadUIMainWindowInstance;"
    "let volume=0;"
    "try{const d=await SteamClient.System.Audio.GetDevices();"
    "const a=d.activeOutputDeviceId;"
    "const dev=d.vecDevices.find(x=>x.id===a)||d.vecDevices.find(x=>x.bIsDefaultOutputDevice)||d.vecDevices.find(x=>x.bHasOutput);"
    "volume=Math.round(((dev&&dev.flOutputVolume)||0)*100);}catch(e2){}"
    "return JSON.stringify({route:w.m_locationPathname||'',"
    "side:!!w.MenuStore.IsAnySideMenuVisible(),volume:volume,muted:false})"
    "}catch(e){return ''}})()"
)

APPS_EXPR = r"""(()=>{try{
  const store=window.appStore;
  const raw=(store&&store.allApps)||[];
  const seen=new Set();
  const out=[];
  const norm=(u)=>{
    if(!u)return '';
    if(u.startsWith('//'))return 'https:'+u;
    if(u.startsWith('/'))return 'https://steamloopback.host'+u;
    return u;
  };
  const bad=(1<<2)|(1<<5)|(1<<6)|(1<<7)|(1<<8)|(1<<9)|(1<<10)|(1<<11)|(1<<12)|(1<<13)|(1<<14)|(1<<15);
  for(const a of raw){
    try{
      if(!a||!a.display_name||a.visible_in_game_list===false||!a.appid||a.appid<=0||seen.has(a.appid))continue;
      const t=Number(a.app_type||0);
      if(t&&(t&bad))continue;
      if(t&&!(t&1)&&!(t&2)&&!(t&0x40000000))continue;
      seen.add(a.appid);
      let art='';
      try{
        const c=store.GetCustomLandcapeImageURLs&&store.GetCustomLandcapeImageURLs(a);
        if(c&&c.length)art=c[0];
        if(!art&&store.GetLandscapeImageURLForApp)art=store.GetLandscapeImageURLForApp(a);
        if(!art&&store.GetPregeneratedVerticalCapsuleForApp)art=store.GetPregeneratedVerticalCapsuleForApp(a);
      }catch(e){}
      let icon='';
      try{if(store.GetIconURLForApp)icon=store.GetIconURLForApp(a);}catch(e){}
      const la=a.libraryAssets||{};
      if(!art)art=la.strCapsuleImage||la.strHeroImage||'';
      let shortcut=false;
      try{shortcut=!!(t&0x40000000)||!!(a.BIsShortcut&&a.BIsShortcut());}catch(e){}
      const images=[];
      const add=(u)=>{u=norm(u);if(u&&images.indexOf(u)<0)images.push(u);};
      if(!shortcut&&a.appid>0){
        add('https://cdn.cloudflare.steamstatic.com/steam/apps/'+a.appid+'/header.jpg');
        add('https://cdn.cloudflare.steamstatic.com/steam/apps/'+a.appid+'/capsule_616x353.jpg');
        add('https://cdn.cloudflare.steamstatic.com/steam/apps/'+a.appid+'/library_600x900.jpg');
        add('https://cdn.cloudflare.steamstatic.com/steam/apps/'+a.appid+'/library_hero.jpg');
        add('https://cdn.cloudflare.steamstatic.com/steam/apps/'+a.appid+'/logo.png');
        add('https://shared.steamstatic.com/store_item_assets/steam/apps/'+a.appid+'/header.jpg');
      }
      add(la.strCapsuleImage);
      add(la.strHeroImage);
      add(art);
      add(icon);
      out.push({
        appid:Number(a.appid),
        name:String(a.display_name),
        art:norm(art)?norm(art):(images[0]||''),
        header:images[0]||'',
        images:images,
        recent:Number(a.rt_recent_activity_time||0),
        mru:Number(a.mru_index===undefined||a.mru_index===null?1e9:a.mru_index),
      });
    }catch(e){}
  }
  out.sort((x,y)=>x.mru!==y.mru?x.mru-y.mru:x.recent!==y.recent?y.recent-x.recent:x.name.localeCompare(y.name,'ru'));
  return JSON.stringify(out);
}catch(e){return JSON.stringify({error:String(e)})}})()"""

STATE_EXPR = (
    "(()=>{try{return JSON.stringify({"
    "visible:!!document.getElementById('wiiu-menu-root'),"
    "closed:!!(window.__WIIU_MENU__&&window.__WIIU_MENU__.closed),"
    "action:window.__WIIU_ACTION__||null"
    "})}catch(e){return ''}})()"
)

SIDEMENU_EXPR = (
    "(()=>{try{return SteamUIStore.WindowStore.GamepadUIMainWindowInstance"
    ".MenuStore.IsAnySideMenuVisible()?'1':'0'}catch(e){return '0'}})()"
)


class Plugin:
    def _log(self, message: str):
        try:
            decky.logger.info(f"[WiiU] {message}")
        except Exception:
            pass

    def _settings_path(self) -> str:
        try:
            directory = decky.DECKY_PLUGIN_SETTINGS_DIR
            os.makedirs(directory, exist_ok=True)
            return os.path.join(directory, "settings.json")
        except Exception:
            return os.path.join(decky.DECKY_PLUGIN_DIR, "settings.json")

    def _load_settings(self):
        path = self._settings_path()
        data = {}
        try:
            with open(path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
        except Exception:
            pass
        self.enabled = data.get("enabled", True) is not False
        self.sounds = data.get("sounds", True) is not False

    def _save_settings(self):
        try:
            with open(self._settings_path(), "w", encoding="utf-8") as handle:
                json.dump(
                    {"enabled": self.enabled, "sounds": self.sounds},
                    handle,
                )
        except Exception as error:
            self._log(f"settings save failed: {error}")

    async def _get_pages(self, session):
        try:
            async with session.get(
                CDP_BASE + "/json", timeout=aiohttp.ClientTimeout(total=2.5)
            ) as response:
                return await response.json(content_type=None)
        except Exception:
            return None

    def _read_battery(self):
        try:
            base = None
            for name in os.listdir("/sys/class/power_supply"):
                if name.startswith("BAT"):
                    base = os.path.join("/sys/class/power_supply", name)
                    break
            if not base:
                return {"level": 0, "charging": False, "present": False}
            with open(os.path.join(base, "capacity"), "r", encoding="utf-8") as handle:
                level = int(handle.read().strip())
            with open(os.path.join(base, "status"), "r", encoding="utf-8") as handle:
                status = handle.read().strip()
            return {
                "level": max(0, min(100, level)),
                "charging": status in ("Charging", "Full"),
                "present": True,
            }
        except Exception:
            return {"level": 0, "charging": False, "present": False}

    def _read_wifi(self):
        try:
            with open("/proc/net/wireless", "r", encoding="utf-8") as handle:
                lines = handle.readlines()
            for line in lines[2:]:
                fields = line.split()
                if not fields or not fields[0].startswith("wlan"):
                    continue
                quality = float(fields[2].rstrip("./"))
                signal = float(fields[3].rstrip("./"))
                if signal >= -50:
                    bars = 4
                elif signal >= -60:
                    bars = 3
                elif signal >= -70:
                    bars = 2
                elif signal >= -80:
                    bars = 1
                else:
                    bars = 0
                return {
                    "level": bars,
                    "signal": int(signal),
                    "connected": quality > 0 and signal < 0,
                }
        except Exception:
            pass
        return {"level": 0, "signal": None, "connected": False}

    async def _read_volume(self):
        try:
            process = await asyncio.create_subprocess_exec(
                "wpctl",
                "get-volume",
                "@DEFAULT_AUDIO_SINK@",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            stdout, _ = await asyncio.wait_for(process.communicate(), timeout=1.0)
            text = stdout.decode("utf-8", errors="ignore")
            match = re.search(r"Volume:\s*([0-9.]+)", text)
            volume = round(float(match.group(1)) * 100) if match else 0
            return {
                "volume": max(0, min(100, volume)),
                "muted": "MUTED" in text,
            }
        except Exception:
            return {"volume": 0, "muted": True}

    async def _push_status(self, session):
        if not self.injected or not self.bpm_ws:
            return
        status = {
            "battery": self._read_battery(),
            "wifi": self._read_wifi(),
            "volume": {"volume": self.live_volume, "muted": False},
        }
        await self._cdp_eval(
            session,
            self.bpm_ws,
            "(()=>{try{window.__WIIU_MENU__&&window.__WIIU_MENU__.setStatus("
            + json.dumps(status)
            + ");return true}catch(e){return false}})()",
            timeout=2.0,
        )

    async def _cdp_eval(self, session, ws_url, expression, timeout=5.0, await_promise=False):
        try:
            async with session.ws_connect(
                ws_url, timeout=timeout, max_msg_size=0, heartbeat=None
            ) as websocket:
                await websocket.send_json(
                    {
                        "id": 1,
                        "method": "Runtime.evaluate",
                        "params": {
                            "expression": expression,
                            "returnByValue": True,
                            "awaitPromise": await_promise,
                        },
                    }
                )
                deadline = time.time() + timeout
                while True:
                    remaining = deadline - time.time()
                    if remaining <= 0:
                        return None
                    message = await websocket.receive(timeout=remaining)
                    if message.type == aiohttp.WSMsgType.TEXT:
                        try:
                            data = json.loads(message.data)
                        except Exception:
                            continue
                        if data.get("id") == 1:
                            result = data.get("result", {})
                            if isinstance(result, dict) and result.get("exceptionDetails"):
                                self._log(
                                    "cdp exception: "
                                    + str(result.get("exceptionDetails"))[:400]
                                )
                                return None
                            return result.get("result", {}).get("value")
                    elif message.type in (
                        aiohttp.WSMsgType.CLOSED,
                        aiohttp.WSMsgType.ERROR,
                    ):
                        return None
        except asyncio.CancelledError:
            raise
        except Exception:
            return None

    async def _fetch_apps(self, session):
        if not self.shared_ws:
            return
        value = await self._cdp_eval(session, self.shared_ws, APPS_EXPR, timeout=6.0)
        if not isinstance(value, str):
            return
        try:
            apps = json.loads(value)
        except Exception:
            return
        if isinstance(apps, list):
            self.apps = apps
            self.last_apps_fetch = time.time()
            self._log(f"apps={len(apps)}")

    async def _mount(self, session):
        if not self.bpm_ws:
            return
        if not self.apps or time.time() - self.last_apps_fetch > 30:
            await self._fetch_apps(session)

        expression = (
            "(function(){try{\n"
            + self.menu_js
            + "\n;window.__WIIU_ACTION__=null;"
            + "window.__WIIU_INTERACTIVE__="
            + ("true" if self.interactive else "false")
            + ";"
            + "window.__WIIU_MENU__.mount("
            + json.dumps(self.apps, ensure_ascii=False)
            + ", {sounds:"
            + ("true" if self.sounds else "false")
            + "});return 'ok';}catch(e){return 'ERR:'+e.message;}})()"
        )
        result = await self._cdp_eval(session, self.bpm_ws, expression, timeout=8.0)
        if result == "ok":
            self.injected = True
            self.last_status_at = 0
            self._log("mounted")
        else:
            self.injected = False
            self._log(f"mount failed: {result}")

    async def _unmount(self, session):
        if not self.bpm_ws:
            self.injected = False
            return
        await self._cdp_eval(
            session,
            self.bpm_ws,
            "(()=>{try{window.__WIIU_MENU__&&window.__WIIU_MENU__.unmount();"
            "document.body.classList.remove('wiiu-menu-open');return true}"
            "catch(e){return false}})()",
            timeout=3.0,
        )
        self.injected = False
        self._log("unmounted")

    async def _handle_action(self, session, action):
        try:
            if not isinstance(action, dict):
                return
            kind = action.get("type")
            if kind == "launch":
                appid = int(action.get("appid") or 0)
                if appid <= 0:
                    return
                expression = (
                    "(()=>{try{SteamClient.Apps.RunGame('"
                    + str(appid)
                    + "','',0,200);return 'ok'}catch(e){return 'ERR:'+e.message}})()"
                )
                result = await self._cdp_eval(
                    session, self.shared_ws, expression, timeout=4.0
                )
                self._log(f"launch {appid}: {result}")
            elif kind == "steam_menu":
                expression = (
                    "(()=>{try{SteamUIStore.WindowStore.GamepadUIMainWindowInstance"
                    ".MenuStore.OpenMainMenu();return 'ok'}catch(e){return 'ERR:'+e.message}})()"
                )
                result = await self._cdp_eval(
                    session, self.shared_ws, expression, timeout=4.0
                )
                self._log(f"steam menu: {result}")
            elif kind == "desktop":
                expression = (
                    "(()=>{try{SteamClient.System.SwitchToDesktop();return 'ok'}"
                    "catch(e){return 'ERR:'+e.message}})()"
                )
                result = await self._cdp_eval(
                    session, self.shared_ws, expression, timeout=4.0
                )
                self._log(f"switch desktop: {result}")
        except Exception as error:
            self._log(f"action failed: {error}")

    def _is_home(self, route: str) -> bool:
        return (
            route in ("/home", "/", "/gamepadui/home", "/library/home")
            or route.startswith("/library/home/")
            or route.startswith("/home?")
        )

    async def _tick(self, session):
        pages = await self._get_pages(session)
        if not isinstance(pages, list):
            return

        shared = next(
            (
                page
                for page in pages
                if page.get("title") == "SharedJSContext"
                and page.get("webSocketDebuggerUrl")
            ),
            None,
        )
        bpm = next(
            (
                page
                for page in pages
                if page.get("webSocketDebuggerUrl")
                and (
                    "Big Picture" in str(page.get("title", ""))
                    or "Режим Big Picture" in str(page.get("title", ""))
                )
            ),
            None,
        )
        if not bpm:
            bpm = next(
                (
                    page
                    for page in pages
                    if page.get("webSocketDebuggerUrl")
                    and "browserType=4" in str(page.get("url", ""))
                ),
                None,
            )

        if shared:
            self.shared_ws = shared["webSocketDebuggerUrl"]
            shared_state = await self._cdp_eval(
                session,
                self.shared_ws,
                SHARED_STATE_EXPR,
                timeout=2.5,
                await_promise=True,
            )
            route = None
            side_open = False
            if isinstance(shared_state, str) and shared_state:
                try:
                    parsed = json.loads(shared_state)
                    route = parsed.get("route")
                    side_open = bool(parsed.get("side"))
                    self.live_volume = max(
                        0, min(100, int(parsed.get("volume") or 0))
                    )
                except Exception:
                    pass
            if isinstance(route, str):
                if route != self.route:
                    self.route = route
                    self._log(f"route={route or '(empty)'}")
            interactive = not side_open
            if interactive != self.interactive:
                self.interactive = interactive
                if self.injected and self.bpm_ws:
                    await self._cdp_eval(
                        session,
                        self.bpm_ws,
                        "window.__WIIU_INTERACTIVE__="
                        + ("true" if interactive else "false")
                        + ";true",
                        timeout=2.0,
                    )

        if not bpm:
            if self.injected:
                self.injected = False
            self.bpm_ws = None
            return

        self.bpm_ws = bpm["webSocketDebuggerUrl"]

        if self.injected:
            value = await self._cdp_eval(session, self.bpm_ws, STATE_EXPR, timeout=2.5)
            state = {}
            if isinstance(value, str) and value:
                try:
                    state = json.loads(value)
                except Exception:
                    state = {}
            if state.get("closed"):
                self.dismissed = True
            if state.get("action"):
                try:
                    await self._cdp_eval(
                        session,
                        self.bpm_ws,
                        "window.__WIIU_ACTION__=null;true",
                        timeout=2.0,
                    )
                except Exception:
                    pass
                await self._handle_action(session, state.get("action"))
            if not state.get("visible", True):
                self.injected = False
            elif not self.apps or time.time() - self.last_apps_fetch > 60:
                await self._fetch_apps(session)
                if self.apps:
                    await self._cdp_eval(
                        session,
                        self.bpm_ws,
                        "(()=>{try{window.__WIIU_MENU__&&window.__WIIU_MENU__.setApps("
                        + json.dumps(self.apps, ensure_ascii=False)
                        + ");return true}catch(e){return false}})()",
                        timeout=5.0,
                    )

        if not self._is_home(self.route):
            self.dismissed = False

        want = self.force_open or (
            self.enabled and self._is_home(self.route) and not self.dismissed
        )

        if want and not self.injected:
            await self._mount(session)
        elif not want and self.injected:
            await self._unmount(session)

        if self.injected and time.time() - self.last_status_at >= 0.7:
            self.last_status_at = time.time()
            await self._push_status(session)

    async def _monitor(self):
        self.session = aiohttp.ClientSession()
        try:
            while True:
                try:
                    await self._tick(self.session)
                except asyncio.CancelledError:
                    raise
                except Exception as error:
                    self._log(f"monitor: {error}")
                await asyncio.sleep(0.65)
        finally:
            try:
                await self.session.close()
            except Exception:
                pass
            self.session = None

    # ------------------------------------------------------------- RPC API
    async def get_state(self):
        return {
            "enabled": self.enabled,
            "sounds": self.sounds,
            "route": self.route,
            "visible": self.injected,
            "apps": len(self.apps),
            "dismissed": self.dismissed,
            "force_open": self.force_open,
        }

    async def set_enabled(self, enabled: bool):
        self.enabled = bool(enabled)
        if self.enabled:
            self.dismissed = False
        else:
            self.force_open = False
            self.dismissed = True
        self._save_settings()
        if self.session and not self.enabled and self.injected:
            await self._unmount(self.session)
        self._log(f"enabled={self.enabled}")
        return await self.get_state()

    async def set_sounds(self, sounds: bool):
        self.sounds = bool(sounds)
        self._save_settings()
        if self.session and self.injected:
            await self._cdp_eval(
                self.session,
                self.bpm_ws,
                "(()=>{try{window.__WIIU_MENU__&&window.__WIIU_MENU__.setSounds("
                + ("true" if self.sounds else "false")
                + ");return true}catch(e){return false}})()",
                timeout=2.0,
            )
        return await self.get_state()

    async def open_menu(self):
        self.force_open = True
        self.dismissed = False
        if self.session and self.shared_ws and not self.injected:
            await self._mount(self.session)
        return await self.get_state()

    async def close_menu(self):
        self.force_open = False
        self.dismissed = True
        if self.session and self.injected:
            await self._cdp_eval(
                self.session,
                self.bpm_ws,
                "(()=>{try{window.__WIIU_MENU__&&window.__WIIU_MENU__.close();return true}"
                "catch(e){return false}})()",
                timeout=2.0,
            )
            self.injected = False
        return await self.get_state()

    async def refresh_apps(self):
        if self.session:
            await self._fetch_apps(self.session)
            if self.injected and self.bpm_ws:
                await self._cdp_eval(
                    self.session,
                    self.bpm_ws,
                    "(()=>{try{window.__WIIU_MENU__&&window.__WIIU_MENU__.setApps("
                    + json.dumps(self.apps, ensure_ascii=False)
                    + ");return true}catch(e){return false}})()",
                    timeout=5.0,
                )
        return await self.get_state()

    async def switch_desktop(self):
        if self.session and self.shared_ws:
            await self._cdp_eval(
                self.session,
                self.shared_ws,
                "(()=>{try{SteamClient.System.SwitchToDesktop();return 'ok'}"
                "catch(e){return 'ERR:'+e.message}})()",
                timeout=4.0,
            )
        return await self.get_state()

    async def log(self, message: str):
        self._log(str(message))

    async def _main(self):
        self.enabled = True
        self.sounds = True
        self.force_open = False
        self.dismissed = False
        self.route = ""
        self.injected = False
        self.bpm_ws = None
        self.shared_ws = None
        self.apps = []
        self.last_apps_fetch = 0
        self.session = None
        self.interactive = True
        self.last_status_at = 0
        self.live_volume = 0
        self.menu_js = ""
        try:
            with open(
                os.path.join(decky.DECKY_PLUGIN_DIR, "menu.js"),
                "r",
                encoding="utf-8",
            ) as handle:
                self.menu_js = handle.read()
        except Exception as error:
            self._log(f"menu.js read failed: {error}")
        self._load_settings()
        self.task = asyncio.create_task(self._monitor())
        self._log("backend started")

    async def _unload(self):
        try:
            self.task.cancel()
        except Exception:
            pass
        try:
            if self.session and self.injected and self.bpm_ws:
                await self._cdp_eval(
                    self.session,
                    self.bpm_ws,
                    "(()=>{try{window.__WIIU_MENU__&&window.__WIIU_MENU__.unmount();return true}"
                    "catch(e){return false}})()",
                    timeout=2.0,
                )
        except Exception:
            pass
        self._log("backend stopped")

    async def _uninstall(self):
        self._log("backend uninstalled")
