import {
  canDrop,
  GroupFactory,
  moveNode,
  NavItem,
  NavNode,
  normalize,
  renameGroup,
} from './nav-tree';

const item = (id: string): NavItem => ({ kind: 'item', id, label: id, icon: 'circle' });

const group = (id: string, ...children: string[]): NavNode => ({
  kind: 'group',
  id,
  label: id,
  children: children.map(item),
});

const fixedGroup: GroupFactory = (children) => ({
  kind: 'group',
  id: 'new',
  label: 'Group',
  children,
});

/** Compact representation of a tree: `['a', 'g[b,c]']`. */
const shape = (nodes: readonly NavNode[]): string[] =>
  nodes.map((node) =>
    node.kind === 'item' ? node.id : `${node.id}[${node.children.map((c) => c.id).join(',')}]`,
  );

describe('nav-tree', () => {
  describe('reordering at the root', () => {
    const tree = [item('a'), item('b'), item('c'), group('g', 'x', 'y')];

    it('moves an item before another item', () => {
      expect(shape(moveNode(tree, 'c', { kind: 'before', refId: 'a' }))).toEqual([
        'c',
        'a',
        'b',
        'g[x,y]',
      ]);
    });

    it('moves an item after another item', () => {
      expect(shape(moveNode(tree, 'a', { kind: 'after', refId: 'b' }))).toEqual([
        'b',
        'a',
        'c',
        'g[x,y]',
      ]);
    });

    it('moves an item to the end', () => {
      expect(shape(moveNode(tree, 'a', { kind: 'root-end' }))).toEqual(['b', 'c', 'g[x,y]', 'a']);
    });

    it('moves a whole group', () => {
      expect(shape(moveNode(tree, 'g', { kind: 'before', refId: 'a' }))).toEqual([
        'g[x,y]',
        'a',
        'b',
        'c',
      ]);
    });

    it('does not mutate the input', () => {
      const snapshot = JSON.stringify(tree);
      moveNode(tree, 'a', { kind: 'combine', refId: 'b' }, fixedGroup);
      moveNode(tree, 'x', { kind: 'root-end' });
      expect(JSON.stringify(tree)).toBe(snapshot);
    });
  });

  describe('grouping', () => {
    it('combines two root items into a new group at the target position', () => {
      const tree = [item('a'), item('b'), item('c')];
      expect(shape(moveNode(tree, 'c', { kind: 'combine', refId: 'a' }, fixedGroup))).toEqual([
        'new[a,c]',
        'b',
      ]);
    });

    it('adds an item to an existing group', () => {
      const tree = [item('a'), group('g', 'x', 'y')];
      expect(shape(moveNode(tree, 'a', { kind: 'into', groupId: 'g' }))).toEqual(['g[x,y,a]']);
    });

    it('inserts an item at a specific position inside a group', () => {
      const tree = [item('a'), group('g', 'x', 'y')];
      expect(shape(moveNode(tree, 'a', { kind: 'before', refId: 'y' }))).toEqual(['g[x,a,y]']);
    });

    it('reorders items within a group', () => {
      const tree = [group('g', 'x', 'y', 'z')];
      expect(shape(moveNode(tree, 'z', { kind: 'before', refId: 'x' }))).toEqual(['g[z,x,y]']);
    });
  });

  describe('moving out of groups', () => {
    it('moves an item from a group to the root', () => {
      const tree = [item('a'), group('g', 'x', 'y', 'z')];
      expect(shape(moveNode(tree, 'y', { kind: 'before', refId: 'a' }))).toEqual([
        'y',
        'a',
        'g[x,z]',
      ]);
    });

    it('ungroups a group that is left with a single item', () => {
      const tree = [item('a'), group('g', 'x', 'y'), item('b')];
      expect(shape(moveNode(tree, 'x', { kind: 'root-end' }))).toEqual(['a', 'y', 'b', 'x']);
    });

    it('moves between groups and ungroups the source when needed', () => {
      const tree = [group('g1', 'a', 'b'), group('g2', 'x', 'y')];
      expect(shape(moveNode(tree, 'a', { kind: 'after', refId: 'x' }))).toEqual(['b', 'g2[x,a,y]']);
    });

    it('lets the last-but-one item combine with a root item', () => {
      const tree = [group('g', 'a', 'b'), item('c')];
      expect(shape(moveNode(tree, 'a', { kind: 'combine', refId: 'c' }, fixedGroup))).toEqual([
        'b',
        'new[c,a]',
      ]);
    });

    it('keeps a two-item group intact when an item is dropped back into it', () => {
      const tree = [group('g', 'a', 'b')];
      expect(shape(moveNode(tree, 'a', { kind: 'into', groupId: 'g' }))).toEqual(['g[b,a]']);
    });
  });

  describe('invalid drops', () => {
    const tree = [item('a'), group('g', 'x', 'y'), group('h', 'p', 'q')];

    it.each([
      ['a group into a group', 'g', { kind: 'into', groupId: 'h' }],
      ['a group next to a grouped item', 'g', { kind: 'before', refId: 'p' }],
      ['a group onto an item', 'g', { kind: 'combine', refId: 'a' }],
      ['an item onto a grouped item', 'a', { kind: 'combine', refId: 'x' }],
      ['an item onto a group', 'a', { kind: 'combine', refId: 'g' }],
      ['an item onto itself', 'a', { kind: 'combine', refId: 'a' }],
      ['an item next to itself', 'a', { kind: 'before', refId: 'a' }],
      ['an unknown item', 'nope', { kind: 'root-end' }],
    ] as const)('rejects %s', (_, dragId, target) => {
      expect(canDrop(tree, dragId, target)).toBe(false);
      expect(moveNode(tree, dragId, target)).toBe(tree);
    });
  });

  it('normalize unwraps single-item groups and removes empty ones', () => {
    const tree: NavNode[] = [group('g', 'a'), { kind: 'group', id: 'e', label: 'e', children: [] }];
    expect(shape(normalize(tree))).toEqual(['a']);
  });

  it('renames a group', () => {
    const tree = [item('a'), group('g', 'x', 'y')];
    const renamed = renameGroup(tree, 'g', 'Tools');
    expect(renamed[1].label).toBe('Tools');
    expect(tree[1].label).toBe('g');
  });
});
