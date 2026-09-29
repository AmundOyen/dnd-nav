import { Component, computed, effect, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { DndNavigator, NavItem, NavNode } from './dnd-navigator';

const STORAGE_KEY = 'dnd-nav.items';
const EXPANDED_KEY = 'dnd-nav.expanded';

const DEFAULT_ITEMS: readonly NavNode[] = [
  { kind: 'item', id: 'home', label: 'Home', icon: 'home' },
  { kind: 'item', id: 'inbox', label: 'Inbox', icon: 'inbox' },
  {
    kind: 'group',
    id: 'group-media',
    label: 'Media',
    children: [
      { kind: 'item', id: 'photos', label: 'Photos', icon: 'photo_library' },
      { kind: 'item', id: 'music', label: 'Music', icon: 'library_music' },
      { kind: 'item', id: 'videos', label: 'Videos', icon: 'movie' },
    ],
  },
  { kind: 'item', id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
  { kind: 'item', id: 'contacts', label: 'Contacts', icon: 'contacts' },
  { kind: 'item', id: 'files', label: 'Files', icon: 'folder_copy' },
  { kind: 'item', id: 'analytics', label: 'Analytics', icon: 'insights' },
  { kind: 'item', id: 'settings', label: 'Settings', icon: 'settings' },
];

// Storage can be unavailable (private mode, quota); the demo still works without it.
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore: see readStorage.
  }
}

function loadItems(): readonly NavNode[] {
  try {
    const stored = readStorage(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as NavNode[]) : DEFAULT_ITEMS;
  } catch {
    return DEFAULT_ITEMS;
  }
}

@Component({
  selector: 'app-root',
  imports: [DndNavigator, JsonPipe, MatButtonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly items = signal(loadItems());
  protected readonly navExpanded = signal(readStorage(EXPANDED_KEY) === 'true');
  protected readonly active = signal<NavItem | null>(null);
  protected readonly activeId = computed(() => this.active()?.id ?? null);

  constructor() {
    effect(() => writeStorage(STORAGE_KEY, JSON.stringify(this.items())));
    effect(() => writeStorage(EXPANDED_KEY, String(this.navExpanded())));
  }

  protected reset(): void {
    this.items.set(DEFAULT_ITEMS);
  }
}
