/** A single navigable entry, rendered as an icon above a label. */
export interface NavItem {
  readonly kind: 'item';
  readonly id: string;
  readonly label: string;
  /** Material icon ligature name, e.g. `home`. */
  readonly icon: string;
}

/** An expandable group of items. Groups only live at the root and never nest. */
export interface NavGroup {
  readonly kind: 'group';
  readonly id: string;
  readonly label: string;
  readonly children: readonly NavItem[];
}

export type NavNode = NavItem | NavGroup;

/** Where a dragged node should end up. */
export type DropTarget =
  /** Next to another node, at the root or inside a group. */
  | { readonly kind: 'before' | 'after'; readonly refId: string }
  /** On top of a root item: both items are merged into a new group. */
  | { readonly kind: 'combine'; readonly refId: string }
  /** Appended to an existing group. */
  | { readonly kind: 'into'; readonly groupId: string }
  /** Appended to the root list. */
  | { readonly kind: 'root-end' };

export interface NodeLocation {
  readonly node: NavNode;
  /** Id of the containing group, or `null` when the node is at the root. */
  readonly parentId: string | null;
  readonly index: number;
}

export type GroupFactory = (items: readonly NavItem[]) => NavGroup;

export const createGroup: GroupFactory = (children) => ({
  kind: 'group',
  id: `group-${crypto.randomUUID()}`,
  label: 'Group',
  children,
});

export function findNode(nodes: readonly NavNode[], id: string): NodeLocation | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === id) {
      return { node, parentId: null, index: i };
    }
    if (node.kind === 'group') {
      const index = node.children.findIndex((child) => child.id === id);
      if (index !== -1) {
        return { node: node.children[index], parentId: node.id, index };
      }
    }
  }
  return null;
}

/** Whether dropping `dragId` on `target` is allowed. */
export function canDrop(nodes: readonly NavNode[], dragId: string, target: DropTarget): boolean {
  const dragged = findNode(nodes, dragId);
  if (!dragged) {
    return false;
  }
  const isGroup = dragged.node.kind === 'group';

  switch (target.kind) {
    case 'root-end':
      return true;
    case 'into': {
      const group = findNode(nodes, target.groupId);
      return !isGroup && group?.node.kind === 'group';
    }
    case 'combine': {
      const ref = findNode(nodes, target.refId);
      return (
        !isGroup && target.refId !== dragId && ref?.parentId === null && ref.node.kind === 'item'
      );
    }
    case 'before':
    case 'after': {
      const ref = findNode(nodes, target.refId);
      // Groups can't be placed inside other groups.
      return !!ref && target.refId !== dragId && (!isGroup || ref.parentId === null);
    }
  }
}

/**
 * Moves `dragId` to `target` and returns a new tree. The input is never mutated.
 * Groups that end up with a single item are ungrouped, and empty groups are removed.
 * Returns the original array when the drop isn't allowed.
 */
export function moveNode(
  nodes: readonly NavNode[],
  dragId: string,
  target: DropTarget,
  groupFactory: GroupFactory = createGroup,
): readonly NavNode[] {
  const dragged = findNode(nodes, dragId);
  if (!dragged || !canDrop(nodes, dragId, target)) {
    return nodes;
  }
  const without = removeNode(nodes, dragId);
  return normalize(insertNode(without, dragged.node, target, groupFactory));
}

/** Returns a copy of `nodes` with the group's label replaced. */
export function renameGroup(
  nodes: readonly NavNode[],
  groupId: string,
  label: string,
): readonly NavNode[] {
  return nodes.map((node) =>
    node.kind === 'group' && node.id === groupId ? { ...node, label } : node,
  );
}

/** Unwraps groups with a single item and drops empty groups. */
export function normalize(nodes: readonly NavNode[]): NavNode[] {
  return nodes.flatMap<NavNode>((node) => {
    if (node.kind === 'item' || node.children.length > 1) {
      return [node];
    }
    return [...node.children];
  });
}

function removeNode(nodes: readonly NavNode[], id: string): NavNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) =>
      node.kind === 'group' && node.children.some((child) => child.id === id)
        ? { ...node, children: node.children.filter((child) => child.id !== id) }
        : node,
    );
}

function insertNode(
  nodes: NavNode[],
  dragged: NavNode,
  target: DropTarget,
  groupFactory: GroupFactory,
): NavNode[] {
  if (target.kind === 'root-end') {
    return [...nodes, dragged];
  }

  if (target.kind === 'into') {
    return nodes.map((node) =>
      node.kind === 'group' && node.id === target.groupId
        ? { ...node, children: [...node.children, dragged as NavItem] }
        : node,
    );
  }

  const ref = findNode(nodes, target.refId);
  if (!ref) {
    return [...nodes, dragged];
  }

  if (target.kind === 'combine') {
    const result = [...nodes];
    result[ref.index] = groupFactory([ref.node as NavItem, dragged as NavItem]);
    return result;
  }

  const offset = target.kind === 'before' ? 0 : 1;
  if (ref.parentId === null) {
    const result = [...nodes];
    result.splice(ref.index + offset, 0, dragged);
    return result;
  }
  return nodes.map((node) => {
    if (node.kind !== 'group' || node.id !== ref.parentId) {
      return node;
    }
    const children = [...node.children];
    children.splice(ref.index + offset, 0, dragged as NavItem);
    return { ...node, children };
  });
}
