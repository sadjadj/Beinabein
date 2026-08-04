import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/**
 * PillTabs — unified pill-style tabs using shadcn/ui primitives.
 * Active trigger uses brand (primary) color. Pass `bar` to wrap the list
 * in the standard full-width white bar (hubs); omit/false renders inline.
 */
export default function PillTabs({ tabs, value, onValueChange, bar = true, contentClassName, listClassName }) {
  const list = (
    <TabsList
      className={cn(
        'bg-muted/40 h-auto p-1 gap-1 inline-flex rounded-full border border-border overflow-x-auto max-w-full',
        listClassName
      )}
    >
      {tabs.map(t => (
        <TabsTrigger
          key={t.key}
          value={t.key}
          className="rounded-full px-4 py-1.5 text-sm font-medium gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none text-muted-foreground hover:text-foreground whitespace-nowrap"
        >
          {t.icon && <t.icon className="w-4 h-4 flex-shrink-0" />}
          {t.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      {bar ? (
        <div className="bg-white border-b border-border">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">{list}</div>
        </div>
      ) : list}
      {tabs.map(t => (
        <TabsContent key={t.key} value={t.key} className={cn('mt-0 focus-visible:outline-none', contentClassName)}>
          {t.Component ? <t.Component /> : t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}