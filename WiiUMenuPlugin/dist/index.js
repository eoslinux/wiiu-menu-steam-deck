const manifest = {"name":"Wii U Menu"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

const getState = callable("get_state");
const setEnabled = callable("set_enabled");
const setSounds = callable("set_sounds");
const openMenu = callable("open_menu");
const closeMenu = callable("close_menu");
const refreshApps = callable("refresh_apps");
const switchDesktop = callable("switch_desktop");
async function safe(promise, fallback) {
    try {
        return await promise;
    }
    catch {
        return fallback;
    }
}
const QAMPanel = () => {
    const [state, setState] = SP_REACT.useState(null);
    const [busy, setBusy] = SP_REACT.useState(false);
    const refresh = async () => {
        const next = await safe(getState(), null);
        if (next)
            setState(next);
    };
    SP_REACT.useEffect(() => {
        void refresh();
        const timer = window.setInterval(refresh, 1600);
        return () => window.clearInterval(timer);
    }, []);
    const apply = async (promise) => {
        setBusy(true);
        try {
            const next = await safe(promise, null);
            if (next)
                setState(next);
        }
        finally {
            setBusy(false);
        }
    };
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "Wii U Menu", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "\u0417\u0430\u043C\u0435\u043D\u044F\u0442\u044C \u0433\u043B\u0430\u0432\u043D\u044B\u0439 \u044D\u043A\u0440\u0430\u043D", description: "\u041F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u043E\u0435 \u043C\u0435\u043D\u044E Wii U \u0432\u043C\u0435\u0441\u0442\u043E \u0440\u043E\u0434\u043D\u043E\u0433\u043E Home", checked: state?.enabled !== false, disabled: busy, onChange: (value) => void apply(setEnabled(value)) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "\u0417\u0432\u0443\u043A\u0438 \u043C\u0435\u043D\u044E", description: "\u0422\u0438\u043A \u0444\u043E\u043A\u0443\u0441\u0430, \u0432\u044B\u0431\u043E\u0440, \u043D\u0430\u0437\u0430\u0434, \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0438 \u0437\u0430\u043F\u0443\u0441\u043A", checked: state?.sounds !== false, disabled: busy, onChange: (value) => void apply(setSounds(value)) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => {
                        void apply(openMenu());
                        try {
                            DFL.Navigation.CloseSideMenus();
                        }
                        catch {
                            // Ignore.
                        }
                    }, children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043C\u0435\u043D\u044E Wii U" }) }), state?.visible ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => void apply(closeMenu()), children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043C\u0435\u043D\u044E \u0438 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C Steam" }) })) : null, SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => void apply(switchDesktop()), children: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u0432 \u0440\u0430\u0431\u043E\u0447\u0438\u0439 \u0441\u0442\u043E\u043B" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => void apply(refreshApps()), children: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u0438\u0433\u0440" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: 12, opacity: 0.55, lineHeight: "17px" }, children: ["A \u2014 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0438\u0433\u0440\u0443, B \u2014 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C Steam, L1/R1 \u2014 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B.", SP_JSX.jsx("br", {}), "\u041C\u0430\u0440\u0448\u0440\u0443\u0442: ", state?.route || "неизвестен", SP_JSX.jsx("br", {}), "\u0418\u0433\u0440 \u043D\u0430\u0439\u0434\u0435\u043D\u043E: ", state?.apps ?? 0, state?.visible ? " · меню открыто" : ""] }) })] }));
};
const WiiUIcon = () => (SP_JSX.jsxs("svg", { width: "1em", height: "1em", viewBox: "0 0 24 24", "aria-hidden": "true", children: [SP_JSX.jsx("rect", { x: "1.5", y: "1.5", width: "21", height: "21", rx: "5", fill: "#00a2e8" }), SP_JSX.jsx("path", { d: "M7.5 7v5.2a4.5 4.5 0 0 0 9 0V7", fill: "none", stroke: "#ffffff", strokeWidth: "2.4", strokeLinecap: "round" })] }));
var index = definePlugin(() => {
    return {
        name: "Wii U Menu",
        titleView: SP_JSX.jsx("div", { className: DFL.staticClasses.Title, children: "Wii U Menu" }),
        content: SP_JSX.jsx(QAMPanel, {}),
        icon: SP_JSX.jsx(WiiUIcon, {}),
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
