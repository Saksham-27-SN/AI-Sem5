import React, { createContext, useContext, useId } from 'react';

interface TabsContextType {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children?: React.ReactNode;
  items?: TabItem[];
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  children,
  items,
  className = '',
}) => {
  const baseId = useId();

  return (
    <TabsContext.Provider value={{ activeTab: value, onSelectTab: onValueChange, baseId }}>
      <div className={`w-full ${className}`}>
        {items ? (
          <TabList>
            {items.map((item) => (
              <TabTrigger
                key={item.id}
                value={item.id}
                icon={item.icon}
                badge={item.badge}
                disabled={item.disabled}
              >
                {item.label}
              </TabTrigger>
            ))}
          </TabList>
        ) : null}
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

export const TabList: React.FC<TabListProps> = ({
  children,
  className = '',
  'aria-label': ariaLabel = 'Tab list',
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
    );
    if (!tabs.length) return;

    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`flex items-center gap-1 border-b border-[#1E293B] overflow-x-auto p-1 scrollbar-none ${className}`}
    >
      {children}
    </div>
  );
};

export interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  className?: string;
}

export const TabTrigger: React.FC<TabTriggerProps> = ({
  value,
  children,
  icon,
  badge,
  disabled = false,
  className = '',
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabTrigger must be used within a Tabs component');
  }

  const { activeTab, onSelectTab, baseId } = context;
  const isSelected = activeTab === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  return (
    <button
      role="tab"
      id={tabId}
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      onClick={() => onSelectTab(value)}
      className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
        isSelected
          ? 'bg-blue-600/15 text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-500/10'
          : 'text-gray-300 hover:text-white hover:bg-gray-800/50 border border-transparent'
      } ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
            isSelected
              ? 'bg-blue-500/30 text-blue-200'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

export interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  value,
  children,
  className = '',
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabPanel must be used within a Tabs component');
  }

  const { activeTab, baseId } = context;
  const isSelected = activeTab === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  if (!isSelected) return null;

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      tabIndex={0}
      className={`pt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl ${className}`}
    >
      {children}
    </div>
  );
};
