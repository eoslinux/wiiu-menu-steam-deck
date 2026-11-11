import { definePlugin, callable } from "@decky/api";
import {
  ButtonItem,
  Navigation,
  PanelSection,
  PanelSectionRow,
  ToggleField,
  staticClasses,
} from "@decky/ui";
import React, { FC, useEffect, useState } from "react";

interface WiiUState {
  enabled: boolean;
  sounds: boolean;
  route: string;
  visible: boolean;
  apps: number;
  dismissed: boolean;
  force_open: boolean;
}

const getState = callable<[], WiiUState>("get_state");
const setEnabled = callable<[enabled: boolean], WiiUState>("set_enabled");
const setSounds = callable<[sounds: boolean], WiiUState>("set_sounds");
const openMenu = callable<[], WiiUState>("open_menu");
const closeMenu = callable<[], WiiUState>("close_menu");
const refreshApps = callable<[], WiiUState>("refresh_apps");
const switchDesktop = callable<[], WiiUState>("switch_desktop");

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

const QAMPanel: FC = () => {
  const [state, setState] = useState<WiiUState | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const next = await safe(getState(), null as unknown as WiiUState);
    if (next) setState(next);
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 1600);
    return () => window.clearInterval(timer);
  }, []);

  const apply = async (promise: Promise<WiiUState>) => {
    setBusy(true);
    try {
      const next = await safe(promise, null as unknown as WiiUState);
      if (next) setState(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelSection title="Wii U Menu">
      <PanelSectionRow>
        <ToggleField
          label="Заменять главный экран"
          description="Полноэкранное меню Wii U вместо родного Home"
          checked={state?.enabled !== false}
          disabled={busy}
          onChange={(value: boolean) => void apply(setEnabled(value))}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <ToggleField
          label="Звуки меню"
          description="Тик фокуса, выбор, назад, страницы и запуск"
          checked={state?.sounds !== false}
          disabled={busy}
          onChange={(value: boolean) => void apply(setSounds(value))}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          disabled={busy}
          onClick={() => {
            void apply(openMenu());
            try {
              Navigation.CloseSideMenus();
            } catch {
              // Ignore.
            }
          }}
        >
          Открыть меню Wii U
        </ButtonItem>
      </PanelSectionRow>
      {state?.visible ? (
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            disabled={busy}
            onClick={() => void apply(closeMenu())}
          >
            Закрыть меню и показать Steam
          </ButtonItem>
        </PanelSectionRow>
      ) : null}
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          disabled={busy}
          onClick={() => void apply(switchDesktop())}
        >
          Перейти в рабочий стол
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          disabled={busy}
          onClick={() => void apply(refreshApps())}
        >
          Обновить список игр
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: 12, opacity: 0.55, lineHeight: "17px" }}>
          A — запустить игру, B — показать Steam, L1/R1 — страницы.
          <br />
          Маршрут: {state?.route || "неизвестен"}
          <br />
          Игр найдено: {state?.apps ?? 0}
          {state?.visible ? " · меню открыто" : ""}
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
};

const WiiUIcon: FC = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="#00a2e8" />
    <path
      d="M7.5 7v5.2a4.5 4.5 0 0 0 9 0V7"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

export default definePlugin(() => {
  return {
    name: "Wii U Menu",
    titleView: <div className={staticClasses.Title}>Wii U Menu</div>,
    content: <QAMPanel />,
    icon: <WiiUIcon />,
  };
});
