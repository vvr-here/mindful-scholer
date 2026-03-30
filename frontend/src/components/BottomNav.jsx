/**
 * BottomNav.jsx — Persistent bottom navigation bar
 */
import React from "react";

const NAV_ITEMS = [
  { key: "home",     icon: "home",          label: "Home"    },
  { key: "tasks",    icon: "checklist",     label: "To-do"   },
  { key: "workouts", icon: "fitness_center",label: "Workouts"},
  { key: "social",   icon: "forum",         label: "Social"  },
];

export default function BottomNav({ active, onNavigate }) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          id={`nav-${item.key}`}
          className={`nav-item ${active === item.key ? "active" : ""}`}
          onClick={() => onNavigate(item.key)}
          aria-current={active === item.key ? "page" : undefined}
        >
          <span className="material-symbols-rounded nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
