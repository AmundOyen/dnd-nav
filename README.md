# dnd-nav
Drag and drop navigator

A vertical navigation rail for Angular 22 with drag-and-drop reordering and grouping.
Each item shows its icon above its label.

- **Reorder**: drop near the top or bottom edge of an item to place the dragged item before or after it.
- **Group**: drop on the middle of a root item to merge both items into a new, expandable group.
- **Add to a group**: hover a collapsed group while dragging and it expands after 500 ms.
  Then drop between its items, or drop on the group header to append.
- **Move between groups or out to the root**: drag an item anywhere else in the rail.
- **Auto-ungroup**: a group left with a single item is replaced by that item.
- **Move a group**: groups can be reordered among the root items. Groups never nest.
- **Rename a group**: double-click it or press F2. Enter saves, Escape cancels.
- **Cancel a drag**: press Escape.
- **Touch**: press and hold an item for 300 ms to start dragging. A quick swipe still scrolls the rail.

## Usage

```ts
import { DndNavigator, NavNode } from './dnd-navigator';

@Component({
  imports: [DndNavigator],
  template: `
    <dnd-navigator
      aria-label="Main"
      [(items)]="items"
      [activeId]="activeId()"
      (itemSelect)="activeId.set($event.id)"
    />
  `,
})
export class Shell {
  readonly items = signal<readonly NavNode[]>([
    { kind: 'item', id: 'home', label: 'Home', icon: 'home' },
    {
      kind: 'group',
      id: 'media',
      label: 'Media',
      children: [
        { kind: 'item', id: 'photos', label: 'Photos', icon: 'photo_library' },
        { kind: 'item', id: 'music', label: 'Music', icon: 'library_music' },
      ],
    },
  ]);
  readonly activeId = signal<string | null>('home');
}
```

| API            | Type                             | Description                                                   |
| -------------- | -------------------------------- | ------------------------------------------------------------- |
| `items`        | `model<readonly NavNode[]>`      | The tree. Every change emits a new, immutable tree via `itemsChange`. |
| `activeId`     | `input<string \| null>`          | Highlights the selected item.                                 |
| `groupFactory` | `input<GroupFactory>`            | Creates a group when two items are combined (id and default label). |
| `itemSelect`   | `output<NavItem>`                | Emitted when an item is clicked (not after a drag).           |

Icons are Material icon ligatures (`<mat-icon>`), and colours come from the Material 3 system tokens
(`--mat-sys-*`), so the rail follows your `mat.theme`. The rail width can be changed with
`--dnd-nav-width`.

The tree operations (`moveNode`, `canDrop`, `normalize`, `renameGroup`) are pure functions in
`nav-tree.ts`, so they can be used on their own, for example in a store or on the server.

## Development

Requires Node.js `^22.22.3 || >=24.15.0` (Angular 22).

```bash
npm install
npm start      # http://localhost:4200
npm test
```
