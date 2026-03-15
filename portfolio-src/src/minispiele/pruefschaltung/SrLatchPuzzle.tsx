import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface SrLatchPuzzleProps {
  onSolved: () => void;
  onAbort: () => void;
}

type ComponentType = "ic" | "vcc" | "gnd" | "set" | "reset" | "terminal";

type PortName =
  | "out"
  | "in"
  | "vcc"
  | "gnd"
  | "a1"
  | "a2"
  | "b1"
  | "b2"
  | "y1"
  | "y2";

type Point = { x: number; y: number };

type PortDef = {
  name: PortName;
  x: number;
  y: number;
  side: "left" | "right" | "top" | "bottom";
};

type ComponentTemplate = {
  label: string;
  width: number;
  height: number;
  ports: PortDef[];
};

type PlacedComponent = {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
};

type Wire = {
  id: string;
  from: string;
  to: string;
  waypoints: Point[];
};

type DragState = {
  componentId: string;
  offsetX: number;
  offsetY: number;
};

const CANVAS_WIDTH = 940;
const CANVAS_HEIGHT = 520;

const templates: Record<ComponentType, ComponentTemplate> = {
  ic: {
    label: "IC",
    width: 252,
    height: 188,
    ports: [
      { name: "a1", x: 0, y: 36, side: "left" },
      { name: "a2", x: 0, y: 74, side: "left" },
      { name: "b1", x: 0, y: 114, side: "left" },
      { name: "b2", x: 0, y: 152, side: "left" },
      { name: "y1", x: 252, y: 48, side: "right" },
      { name: "y2", x: 252, y: 86, side: "right" },
      { name: "vcc", x: 252, y: 126, side: "right" },
      { name: "gnd", x: 252, y: 164, side: "right" },
    ],
  },
  vcc: {
    label: "VCC",
    width: 110,
    height: 64,
    ports: [{ name: "out", x: 110, y: 32, side: "right" }],
  },
  gnd: {
    label: "GND",
    width: 110,
    height: 64,
    ports: [{ name: "out", x: 110, y: 32, side: "right" }],
  },
  set: {
    label: "SET",
    width: 100,
    height: 50,
    ports: [{ name: "out", x: 100, y: 25, side: "right" }],
  },
  reset: {
    label: "RESET",
    width: 100,
    height: 50,
    ports: [{ name: "out", x: 100, y: 25, side: "right" }],
  },
  terminal: {
    label: "Terminal",
    width: 196,
    height: 92,
    ports: [{ name: "in", x: 0, y: 46, side: "left" }],
  },
};

const paletteOrder: ComponentType[] = ["ic", "vcc", "gnd", "set", "reset", "terminal"];

const initialPlacement: Partial<Record<ComponentType, Point>> = {
  ic: { x: 322, y: 118 },
  set: { x: 214, y: 16 },
  reset: { x: 594, y: 16 },
  vcc: { x: 32, y: 84 },
  gnd: { x: 32, y: 374 },
  terminal: { x: 362, y: 392 },
};

const portColor = (portName: PortName) => {
  switch (portName) {
    case "out":
      return "#8be7ff";
    case "in":
      return "#a8ffcf";
    case "vcc":
      return "#ffd98a";
    case "gnd":
      return "#85ffb8";
    case "a1":
    case "a2":
      return "#ffb1b1";
    case "b1":
    case "b2":
      return "#8db4ff";
    case "y1":
      return "#9ef2ff";
    case "y2":
      return "#f0a8ff";
    default:
      return "#dce8ff";
  }
};

const portLabel = (portName: PortName) => {
  switch (portName) {
    case "out":
      return "";
    case "in":
      return "";
    case "vcc":
      return "vcc";
    case "gnd":
      return "gnd";
    default:
      return portName;
  }
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function SrLatchPuzzle({ onSolved, onAbort }: SrLatchPuzzleProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [components, setComponents] = useState<PlacedComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [activeWireStart, setActiveWireStart] = useState<string | null>(null);
  const [activeWireWaypoints, setActiveWireWaypoints] = useState<Point[]>([]);
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null);
  const [setLevel, setSetLevel] = useState(false);
  const [resetLevel, setResetLevel] = useState(false);
  const [terminalOnline, setTerminalOnline] = useState(false);
  const [statusText, setStatusText] = useState("Terminal offline.");

  const componentById = useMemo(
    () => Object.fromEntries(components.map((component) => [component.id, component])) as Record<string, PlacedComponent>,
    [components],
  );

  const componentByType = useMemo(() => {
    const map = new Map<ComponentType, PlacedComponent>();
    components.forEach((component) => {
      map.set(component.type, component);
    });
    return map;
  }, [components]);

  const placedTypes = new Set(components.map((component) => component.type));

  const getPortPoint = useCallback((portId: string): Point | null => {
    const [componentId, portNameRaw] = portId.split(":");
    const component = componentById[componentId];
    if (!component) return null;
    const template = templates[component.type];
    const port = template.ports.find((entry) => entry.name === portNameRaw);
    if (!port) return null;
    const pinReach = 12;
    switch (port.side) {
      case "left":
        return { x: component.x - pinReach, y: component.y + port.y };
      case "right":
        return { x: component.x + template.width + pinReach, y: component.y + port.y };
      case "top":
        return { x: component.x + port.x, y: component.y - pinReach };
      case "bottom":
        return { x: component.x + port.x, y: component.y + template.height + pinReach };
      default:
        return { x: component.x + port.x, y: component.y + port.y };
    }
  }, [componentById]);

  const normalizeConnection = (a: string, b: string) =>
    [a, b].sort((left, right) => left.localeCompare(right)).join("|");

  const isTerminalInputPort = (portId: string) => {
    const [componentId, portName] = portId.split(":");
    return componentById[componentId]?.type === "terminal" && portName === "in";
  };

  const isLatchValid = useMemo(() => {
    const icComp = componentByType.get("ic");
    const vccComp = componentByType.get("vcc");
    const gndComp = componentByType.get("gnd");
    const setComp = componentByType.get("set");
    const resetComp = componentByType.get("reset");
    const termComp = componentByType.get("terminal");
    if (!icComp || !vccComp || !gndComp || !setComp || !resetComp || !termComp) return false;

    const adjacent = new Map<string, Set<string>>();
    const addEdge = (a: string, b: string) => {
      if (!adjacent.has(a)) adjacent.set(a, new Set());
      if (!adjacent.has(b)) adjacent.set(b, new Set());
      adjacent.get(a)!.add(b);
      adjacent.get(b)!.add(a);
    };
    wires.forEach((wire) => addEdge(wire.from, wire.to));

    const icId = icComp.id;
    const connected = (a: string, b: string) =>
      adjacent.get(a)?.has(b) || adjacent.get(b)?.has(a) || false;

    // VCC and GND power connections
    if (!connected(`${vccComp.id}:out`, `${icId}:vcc`)) return false;
    if (!connected(`${gndComp.id}:out`, `${icId}:gnd`)) return false;

    const setOut = `${setComp.id}:out`;
    const resetOut = `${resetComp.id}:out`;

    // SET and RESET must go to different NAND gates (a-side vs b-side)
    const setToA = connected(setOut, `${icId}:a1`) || connected(setOut, `${icId}:a2`);
    const setToB = connected(setOut, `${icId}:b1`) || connected(setOut, `${icId}:b2`);
    const resetToA = connected(resetOut, `${icId}:a1`) || connected(resetOut, `${icId}:a2`);
    const resetToB = connected(resetOut, `${icId}:b1`) || connected(resetOut, `${icId}:b2`);
    if (!(setToA && resetToB) && !(setToB && resetToA)) return false;

    // Cross-feedback: y1 ↔ b-side and y2 ↔ a-side, or y1 ↔ a-side and y2 ↔ b-side
    const y1 = `${icId}:y1`;
    const y2 = `${icId}:y2`;
    const y1ToA = connected(y1, `${icId}:a1`) || connected(y1, `${icId}:a2`);
    const y1ToB = connected(y1, `${icId}:b1`) || connected(y1, `${icId}:b2`);
    const y2ToA = connected(y2, `${icId}:a1`) || connected(y2, `${icId}:a2`);
    const y2ToB = connected(y2, `${icId}:b1`) || connected(y2, `${icId}:b2`);
    if (!(y1ToB && y2ToA) && !(y1ToA && y2ToB)) return false;

    // Terminal must be connected to one of the outputs
    const termIn = `${termComp.id}:in`;
    if (!connected(termIn, y1) && !connected(termIn, y2)) return false;

    return true;
  }, [wires, componentByType]);

  const builtConnectionKeys = useMemo(
    () => new Set(wires.map((wire) => normalizeConnection(wire.from, wire.to))),
    [wires],
  );

  const activeWirePoints = useMemo(() => {
    if (!activeWireStart) return null;
    const start = getPortPoint(activeWireStart);
    if (!start) return null;
    const points = [start, ...activeWireWaypoints];
    if (cursorPoint) points.push(cursorPoint);
    return points;
  }, [activeWireStart, activeWireWaypoints, cursorPoint, getPortPoint]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!dragRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const component = componentById[dragRef.current.componentId];
      if (!component) return;
      const template = templates[component.type];
      const x = clamp(event.clientX - rect.left - dragRef.current.offsetX, 8, rect.width - template.width - 8);
      const y = clamp(event.clientY - rect.top - dragRef.current.offsetY, 8, rect.height - template.height - 8);
      setComponents((current) =>
        current.map((entry) =>
          entry.id === dragRef.current?.componentId ? { ...entry, x, y } : entry,
        ),
      );
    };

    const onPointerUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [componentById]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveWireStart(null);
        setActiveWireWaypoints([]);
        setCursorPoint(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const placeComponent = (type: ComponentType, x: number, y: number) => {
    if (placedTypes.has(type)) return;
    const template = templates[type];
    setComponents((current) => [
      ...current,
      {
        id: `${type}-${Date.now()}-${current.length}`,
        type,
        x: clamp(x, 8, CANVAS_WIDTH - template.width - 8),
        y: clamp(y, 8, CANVAS_HEIGHT - template.height - 8),
      },
    ]);
  };

  const handlePaletteDragStart = (event: React.DragEvent<HTMLButtonElement>, type: ComponentType) => {
    event.dataTransfer.setData("text/component-type", type);
    event.dataTransfer.effectAllowed = "copy";
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!canvasRef.current) return;
    const type = event.dataTransfer.getData("text/component-type") as ComponentType;
    if (!type || !templates[type]) return;
    const rect = canvasRef.current.getBoundingClientRect();
    placeComponent(type, event.clientX - rect.left - templates[type].width / 2, event.clientY - rect.top - 18);
    setStatusText(`${templates[type].label} platziert.`);
  };

  const beginComponentDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    componentId: string,
  ) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-port='true']") || target.closest("[data-control='true']")) {
      return;
    }
    const component = componentById[componentId];
    if (!component) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      componentId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
  };

  const startOrFinishWire = (portId: string) => {
    if (activeWireStart === portId) {
      setActiveWireStart(null);
      setActiveWireWaypoints([]);
      setCursorPoint(null);
      return;
    }

    if (!activeWireStart) {
      setActiveWireStart(portId);
      setActiveWireWaypoints([]);
      return;
    }

    if (builtConnectionKeys.has(normalizeConnection(activeWireStart, portId))) {
      setStatusText("Leitung existiert bereits.");
      setActiveWireStart(null);
      setActiveWireWaypoints([]);
      setCursorPoint(null);
      return;
    }

    const terminalPortTarget =
      isTerminalInputPort(activeWireStart) ? activeWireStart : isTerminalInputPort(portId) ? portId : null;

    if (
      terminalPortTarget &&
      wires.some((wire) => wire.from === terminalPortTarget || wire.to === terminalPortTarget)
    ) {
      setStatusText("Am Terminal ist nur ein Eingangssignal erlaubt.");
      setActiveWireStart(null);
      setActiveWireWaypoints([]);
      setCursorPoint(null);
      return;
    }

    setWires((current) => [
      ...current,
      {
        id: `wire-${Date.now()}-${current.length}`,
        from: activeWireStart,
        to: portId,
        waypoints: activeWireWaypoints,
      },
    ]);
    setStatusText("Leitung gesetzt.");
    setActiveWireStart(null);
    setActiveWireWaypoints([]);
    setCursorPoint(null);
  };

  const addWaypoint = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activeWireStart || !canvasRef.current) return;
    if (event.target !== event.currentTarget) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    setActiveWireWaypoints((current) => [...current, { x, y }]);
  };

  const updateCursorPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activeWireStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    setCursorPoint({ x, y });
  };

  const clearWires = () => {
    setWires([]);
    setActiveWireStart(null);
    setActiveWireWaypoints([]);
    setCursorPoint(null);
    setSetLevel(false);
    setResetLevel(false);
    setTerminalOnline(false);
    setStatusText("Terminal offline.");
  };

  const toggleSwitch = (type: "set" | "reset") => {
    const nextSet = type === "set" ? !setLevel : setLevel;
    const nextReset = type === "reset" ? !resetLevel : resetLevel;

    setSetLevel(nextSet);
    setResetLevel(nextReset);

    if (!isLatchValid) {
      setStatusText(
        type === "set"
          ? `SET = ${nextSet ? 1 : 0}. Noch kein stabiles Signal.`
          : `RESET = ${nextReset ? 1 : 0}. Noch kein stabiles Signal.`,
      );
      return;
    }

    // Forbidden state: both high → Q = 0
    if (nextSet && nextReset) {
      setTerminalOnline(false);
      setStatusText("Verbotener Zustand (S=1, R=1). Q = 0.");
      return;
    }

    if (nextSet) {
      setTerminalOnline(true);
      setStatusText("SET = 1. Terminal online.");
      window.setTimeout(() => {
        onSolved();
      }, 700);
      return;
    }

    if (nextReset) {
      setTerminalOnline(false);
      setStatusText("RESET = 1. Terminal offline.");
      return;
    }

    setStatusText(
      terminalOnline
        ? "SET = 0. Speicher haelt Q."
        : "RESET = 0. Speicher bleibt zurueckgesetzt.",
    );
  };

  const componentBlockStyle = (type: ComponentType): React.CSSProperties => {
    switch (type) {
      case "ic":
        return {
          width: templates.ic.width,
          height: templates.ic.height,
          borderRadius: 26,
          background: "linear-gradient(180deg, rgba(14,18,28,0.99), rgba(7,10,18,0.99))",
          border: "1px solid rgba(186, 215, 255, 0.22)",
          boxShadow: "0 18px 34px rgba(0,0,0,0.24)",
        };
      case "vcc":
      case "gnd":
        return {
          width: templates[type].width,
          height: templates[type].height,
          borderRadius: 18,
          background:
            type === "vcc"
              ? "linear-gradient(180deg, rgba(92,72,20,0.94), rgba(48,34,12,0.98))"
              : "linear-gradient(180deg, rgba(18,52,34,0.94), rgba(10,24,18,0.98))",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
        };
      case "set":
      case "reset":
        return {
          width: templates[type].width,
          height: templates[type].height,
          borderRadius: 22,
          background:
            type === "set"
              ? "linear-gradient(180deg, rgba(92,28,28,0.94), rgba(44,12,12,0.98))"
              : "linear-gradient(180deg, rgba(28,44,92,0.94), rgba(12,20,44,0.98))",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
        };
      case "terminal":
        return {
          width: templates.terminal.width,
          height: templates.terminal.height,
          borderRadius: 22,
          background: "linear-gradient(180deg, rgba(8,14,24,0.98), rgba(4,8,14,0.98))",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
        };
      default:
        return {};
    }
  };

  const renderComponent = (component: PlacedComponent) => {
    const template = templates[component.type];
    const showPortLabels = component.type === "ic";
    const portElements = template.ports.map((port) => {
      const active = activeWireStart === `${component.id}:${port.name}`;
      const pinLength = 12;
      const pinThickness = 4;
      const pinStyle: React.CSSProperties =
        port.side === "left"
          ? {
              left: -pinLength,
              top: port.y - pinThickness / 2,
              width: pinLength,
              height: pinThickness,
            }
          : port.side === "right"
            ? {
                left: template.width,
                top: port.y - pinThickness / 2,
                width: pinLength,
                height: pinThickness,
              }
            : port.side === "top"
              ? {
                  left: port.x - pinThickness / 2,
                  top: -pinLength,
                  width: pinThickness,
                  height: pinLength,
                }
              : {
                  left: port.x - pinThickness / 2,
                  top: template.height,
                  width: pinThickness,
                  height: pinLength,
                };

      const hitAreaStyle: React.CSSProperties =
        port.side === "left"
          ? {
              left: -pinLength - 6,
              top: port.y - 8,
              width: pinLength + 12,
              height: 16,
            }
          : port.side === "right"
            ? {
                left: template.width - 6,
                top: port.y - 8,
                width: pinLength + 12,
                height: 16,
              }
            : port.side === "top"
              ? {
                  left: port.x - 8,
                  top: -pinLength - 6,
                  width: 16,
                  height: pinLength + 12,
                }
              : {
                  left: port.x - 8,
                  top: template.height - 6,
                  width: 16,
                  height: pinLength + 12,
                };

      return (
        <div
          key={`${component.id}:${port.name}`}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              ...pinStyle,
              borderRadius: 1,
              background: active ? "#f8fbff" : "rgba(218, 226, 241, 0.82)",
              boxShadow: active ? "0 0 10px rgba(125,216,255,0.42)" : "none",
              pointerEvents: "none",
            }}
          />
          <button
            key={`${component.id}:${port.name}-button`}
            type="button"
            data-port="true"
            onClick={() => startOrFinishWire(`${component.id}:${port.name}`)}
            style={{
              position: "absolute",
              ...hitAreaStyle,
              border: 0,
              background: "transparent",
              cursor: "crosshair",
              padding: 0,
              outline: "none",
              pointerEvents: "auto",
            }}
            aria-label={`${component.type} ${port.name}`}
          />
        </div>
      );
    });

    return (
      <div
        key={component.id}
        style={{
          position: "absolute",
          left: component.x,
          top: component.y,
          userSelect: "none",
          ...componentBlockStyle(component.type),
        }}
        onPointerDown={(event) => beginComponentDrag(event, component.id)}
      >
        {component.type === "ic" && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 14,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.05)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 22,
                textAlign: "center",
                color: "#cfe0fb",
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.18em",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              IC
            </div>
          </>
        )}

        {(component.type === "vcc" || component.type === "gnd") && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
                  color: component.type === "vcc" ? "#ffe6b3" : "#d9ffeb",
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.08em",
            }}
          >
            {component.type.toUpperCase()}
          </div>
        )}

        {(component.type === "set" || component.type === "reset") && (
          <button
            type="button"
            data-control="true"
            onClick={() => toggleSwitch(component.type as "set" | "reset")}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.14)",
              background:
                component.type === "set"
                  ? setLevel
                    ? "linear-gradient(180deg, #ff8f8f, #b83c3c)"
                    : "linear-gradient(180deg, rgba(92,28,28,0.94), rgba(44,12,12,0.98))"
                  : resetLevel
                    ? "linear-gradient(180deg, #9dc2ff, #426bcb)"
                    : "linear-gradient(180deg, rgba(28,44,92,0.94), rgba(12,20,44,0.98))",
              color: "#f2f6ff",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.1em",
              fontFamily: "'JetBrains Mono', monospace",
              cursor: "pointer",
              boxShadow:
                component.type === "set"
                  ? setLevel
                    ? "0 10px 18px rgba(184,60,60,0.25)"
                    : "0 8px 16px rgba(0,0,0,0.18)"
                  : resetLevel
                    ? "0 10px 18px rgba(66,107,203,0.25)"
                    : "0 8px 16px rgba(0,0,0,0.18)",
            }}
          >
            {component.type === "set" ? "SET" : "RESET"}
          </button>
        )}

        {component.type === "terminal" && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 12,
                borderRadius: 14,
                background: terminalOnline
                  ? "linear-gradient(180deg, rgba(9,57,40,0.96), rgba(6,26,19,0.98))"
                  : "linear-gradient(180deg, rgba(6,10,18,0.98), rgba(2,4,10,0.98))",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "12px 14px",
                boxSizing: "border-box",
              }}
            >
                  {["Coder Terminal", terminalOnline ? "ONLINE" : "OFFLINE", terminalOnline ? "Q stable" : "awaiting Q"].map((line, index) => (
                <div
                  key={line}
                  style={{
                    color: terminalOnline ? "#6bf2b0" : "#8ca3c2",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: index === 0 ? 10 : 9,
                    marginBottom: 6,
                    letterSpacing: index === 0 ? "0.12em" : "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </>
        )}

        {template.ports.map((port) => (
          showPortLabels && (
            <div
              key={`${component.id}-${port.name}-label`}
              style={{
                position: "absolute",
                left:
                  port.side === "left"
                    ? 18
                    : port.side === "right"
                      ? template.width - 58
                      : port.x - 20,
                top:
                  port.side === "top"
                    ? 12
                    : port.side === "bottom"
                      ? template.height - 24
                      : port.y - 8,
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                color: portColor(port.name),
                pointerEvents: "none",
              }}
            >
              {portLabel(port.name)}
            </div>
          )
        ))}

        {portElements}
      </div>
    );
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;

  return (
    <div
      style={{
        width: "min(calc(100vw - 16px), 1240px)",
        borderRadius: 26,
        border: "1px solid rgba(148, 212, 255, 0.16)",
        background:
          "linear-gradient(180deg, rgba(6, 10, 19, 0.97) 0%, rgba(3, 6, 12, 0.985) 100%)",
        boxShadow: "0 32px 100px rgba(0,0,0,0.48)",
        padding: isMobile ? 12 : 22,
        overflowX: "auto",
      }}
    >
        <div
          style={{
            display: isMobile ? "flex" : "grid",
            flexDirection: isMobile ? "column" : undefined,
            gridTemplateColumns: "minmax(0, 1fr) 248px",
            gap: 18,
            minWidth: isMobile ? CANVAS_WIDTH : undefined,
        }}
      >
        <div
          ref={canvasRef}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleCanvasDrop}
          onPointerDown={addWaypoint}
          onPointerMove={updateCursorPoint}
          style={{
            position: "relative",
            height: CANVAS_HEIGHT,
            borderRadius: 24,
            border: "1px solid rgba(104, 168, 255, 0.12)",
            background:
              "linear-gradient(180deg, rgba(10, 18, 34, 0.86) 0%, rgba(5, 10, 20, 0.94) 100%)",
            overflow: "hidden",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(120,170,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,255,0.08) 1px, transparent 1px)",
              backgroundSize: "52px 52px",
              pointerEvents: "none",
            }}
          />

          <svg
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          >
            <defs>
              <filter id="wireGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {wires.map((wire) => {
              const points = [
                getPortPoint(wire.from),
                ...wire.waypoints,
                getPortPoint(wire.to),
              ].filter(Boolean) as Point[];
              const wirePortName = (portId: string) => portId.split(":")[1] as PortName;
              const color = portColor(wirePortName(wire.from)) ?? "#a9d6ff";
              return (
                <polyline
                  key={wire.id}
                  points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#wireGlow)"
                />
              );
            })}
            {activeWirePoints && activeWirePoints.length >= 2 && (
              <polyline
                points={activeWirePoints.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#f8fbff"
                strokeWidth="3"
                strokeDasharray="8 8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.92"
              />
            )}
          </svg>

          {components.map(renderComponent)}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.72rem",
                color: "rgba(188, 212, 255, 0.72)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Status
            </div>
            <div style={{ marginTop: 8, color: "#f7fbff", fontWeight: 700 }}>
              Leitungen: {wires.length}
            </div>
            <p style={{ marginTop: 8, color: "#abc0db", lineHeight: 1.55 }}>
              {statusText}
            </p>
            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={clearWires}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#f0f5ff",
                  padding: "10px 12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Leitungen loeschen
              </button>
              <button
                type="button"
                onClick={onAbort}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#d6e2f4",
                  padding: "10px 12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Schliessen
              </button>
            </div>
          </div>

          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.72rem",
                color: "rgba(188, 212, 255, 0.72)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Palette
            </div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {paletteOrder.map((type) => {
                const disabled = placedTypes.has(type);
                const template = templates[type];
                return (
                  <button
                    key={type}
                    type="button"
                    draggable={!disabled}
                    onDragStart={(event) => handlePaletteDragStart(event, type)}
                    onClick={() => {
                      if (disabled) return;
                      const fallback = initialPlacement[type] ?? { x: 24, y: 24 };
                      placeComponent(type, fallback.x, fallback.y);
                    }}
                    disabled={disabled}
                    style={{
                      textAlign: "left",
                      borderRadius: 16,
                      border: disabled
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: disabled ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.05)",
                      color: disabled ? "#62748e" : "#eff7ff",
                      padding: "12px 14px",
                      cursor: disabled ? "not-allowed" : "grab",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{template.label}</div>
                    <div style={{ marginTop: 6, color: disabled ? "#5a6b82" : "#abc0db", fontSize: "0.84rem" }}>
                      {disabled ? "Bereits im Canvas" : "Ziehen oder klicken zum Platzieren"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
