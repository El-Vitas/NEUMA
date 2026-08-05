export interface TreeSourceItem {
  readonly id: string;
  readonly order: number;
  readonly parentId: string | null;
}

export interface TreeNode<TItem extends TreeSourceItem> {
  readonly children: readonly TreeNode<TItem>[];
  readonly item: TItem;
}
