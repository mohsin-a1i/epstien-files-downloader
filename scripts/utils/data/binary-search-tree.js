class TreeNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

export default class BinarySearchTree {
  constructor() {
    this.root = null;
  }

  insert(value) {
    const newNode = new TreeNode(value);
    if (!this.root) {
      this.root = newNode;
      return;
    }

    let currentNode = this.root;
    while (true) {
      if (value < currentNode.value) {
        if (!currentNode.left) {
          currentNode.left = newNode;
          return;
        } 

        currentNode = currentNode.left;
      } else if (value > currentNode.value) {
        if (!currentNode.right) {
          currentNode.right = newNode;
          return;
        } 

        currentNode = currentNode.right;
      } else {
        console.warn(`Duplicate number ${value} inserted into BinarySearchTree`);
        return;
      }
    }
  }
  
  remove(value) {
    this.root = this._remove(this.root, value);
  }

  _remove(node, value) {
    if (!node) return null;

    if (value < node.value) {
      node.left = this._remove(node.left, value);
    } else if (value > node.value) {
      node.right = this._remove(node.right, value);
    } else {
      if (!node.left && !node.right) return null;
      if (!node.left) return node.right;
      if (!node.right) return node.left;

      const successor = this._minNode(node.right);
      node.value = successor.value;
      node.right = this._remove(node.right, successor.value);
    }

    return node;
  }

  _minNode(node) {
    let current = node;
    while (current.left) current = current.left;
    return current;
  }

  *inOrder(node = this.root) {
    if (!node) return;
    yield* this.inOrder(node.left);
    yield node.value;
    yield* this.inOrder(node.right);
  }

  largestLessThan(value) {
    if (!this.root) return null;

    let current = this.root;
    let candidate = null;

    while (current) {
      if (current.value < value) {
        candidate = current.value;
        current = current.right;
      } else {
        current = current.left;
      }
    }

    return candidate;
  }
}