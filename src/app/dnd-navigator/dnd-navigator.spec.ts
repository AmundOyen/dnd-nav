import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DndNavigator } from './dnd-navigator';
import { NavItem, NavNode } from './nav-tree';

@Component({
  imports: [DndNavigator],
  template: `<dnd-navigator [(items)]="items" (itemSelect)="selected.set($event)" />`,
})
class Host {
  readonly items = signal<readonly NavNode[]>([
    { kind: 'item', id: 'home', label: 'Home', icon: 'home' },
    {
      kind: 'group',
      id: 'media',
      label: 'Media',
      children: [
        { kind: 'item', id: 'photos', label: 'Photos', icon: 'photo' },
        { kind: 'item', id: 'music', label: 'Music', icon: 'music_note' },
      ],
    },
  ]);
  readonly selected = signal<NavItem | null>(null);
}

describe('DndNavigator', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;

  const query = (selector: string) => element.querySelector<HTMLElement>(selector)!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('renders each item with its icon above the label', () => {
    const tile = query('[data-id="home"]');
    expect(tile.children[0].textContent?.trim()).toBe('home');
    expect(tile.children[1].textContent?.trim()).toBe('Home');
  });

  it('emits itemSelect on click', () => {
    query('[data-id="home"]').click();
    expect(fixture.componentInstance.selected()?.id).toBe('home');
  });

  it('toggles a group on click', async () => {
    const header = query('[data-drop="group-header"]');
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('[data-id="photos"]')).toBeNull();

    header.click();
    await fixture.whenStable();

    expect(query('[data-drop="group-header"]').getAttribute('aria-expanded')).toBe('true');
    expect(query('[data-id="photos"]').dataset['parent']).toBe('media');
  });

  it('renames a group with F2 and emits the new tree', async () => {
    query('[data-drop="group-header"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
    await fixture.whenStable();

    const input = query('.rename-input') as HTMLInputElement;
    input.value = 'Library';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();

    expect(fixture.componentInstance.items()[1].label).toBe('Library');
    expect(element.querySelector('.rename-input')).toBeNull();
  });

  it('keeps the original name when renaming is cancelled', async () => {
    query('[data-drop="group-header"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
    await fixture.whenStable();

    const input = query('.rename-input') as HTMLInputElement;
    input.value = 'Nope';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(fixture.componentInstance.items()[1].label).toBe('Media');
  });
});
