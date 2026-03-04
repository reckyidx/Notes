// LFU Cache Implementation using Double Linked List

class DListNode {
  constructor(key, val, freq = 1) {
    this.key = key;
    this.val = val;
    this.freq = freq;
    this.prev = null;
    this.next = null;
  }
}

class DLinkedList {
  constructor() {
    // Dummy head and tail for easy insertion/deletion
    this.head = new DListNode(null, null);
    this.tail = new DListNode(null, null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.size = 0;
  }

  // Add node right after head (most recently used at this frequency)
  addNode(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
    this.size++;
  }

  // Remove node from the list
  removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
    this.size--;
  }

  // Remove and return the least recently used node (node before tail)
  removeLRU() {
    if (this.size === 0) return null;
    const lru = this.tail.prev;
    this.removeNode(lru);
    return lru;
  }
}

class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.size = 0;
    this.minFreq = 0;
    
    // Map key to node
    this.keyToNode = new Map();
    
    // Map frequency to doubly linked list of nodes
    this.freqToNodes = new Map();
  }

  get(key) {
    if (!this.keyToNode.has(key)) {
      return -1;
    }

    // Get the node
    const node = this.keyToNode.get(key);
    
    // Update frequency
    this.updateNode(node);
    
    return node.val;
  }

  put(key, value) {
    if (this.capacity === 0) return;

    // If key exists, update value and frequency
    if (this.keyToNode.has(key)) {
      const node = this.keyToNode.get(key);
      node.val = value;
      this.updateNode(node);
      return;
    }

    // If at capacity, evict LFU item
    if (this.size >= this.capacity) {
      this.evict();
    }

    // Create new node with frequency 1
    const newNode = new DListNode(key, value, 1);
    this.keyToNode.set(key, newNode);
    
    // Add to frequency 1 list
    if (!this.freqToNodes.has(1)) {
      this.freqToNodes.set(1, new DLinkedList());
    }
    this.freqToNodes.get(1).addNode(newNode);
    
    // Update min frequency and size
    this.minFreq = 1;
    this.size++;
  }

  updateNode(node) {
    const oldFreq = node.freq;
    const newFreq = oldFreq + 1;
    
    // Remove node from old frequency list
    const oldList = this.freqToNodes.get(oldFreq);
    oldList.removeNode(node);
    
    // If old list is now empty and it was the min frequency, update min freq
    if (oldList.size === 0 && this.minFreq === oldFreq) {
      this.minFreq = newFreq;
    }
    
    // Update node frequency
    node.freq = newFreq;
    
    // Add node to new frequency list
    if (!this.freqToNodes.has(newFreq)) {
      this.freqToNodes.set(newFreq, new DLinkedList());
    }
    this.freqToNodes.get(newFreq).addNode(node);
  }

  evict() {
    // Get the list with minimum frequency
    const minList = this.freqToNodes.get(this.minFreq);
    
    // Remove the LRU node from the min frequency list
    const lruNode = minList.removeLRU();
    
    // Remove from key map
    this.keyToNode.delete(lruNode.key);
    
    this.size--;
  }

  // Helper method to display cache state (for debugging)
  display() {
    console.log(`=== LFU Cache (Size: ${this.size}/${this.capacity}, MinFreq: ${this.minFreq}) ===`);
    
    for (let [freq, list] of this.freqToNodes) {
      if (list.size > 0) {
        console.log(`Frequency ${freq}:`);
        let curr = list.head.next;
        while (curr !== list.tail) {
          console.log(`  [${curr.key}: ${curr.val}]`);
          curr = curr.next;
        }
      }
    }
    console.log('');
  }
}

// ============== TEST CASES ==============

console.log('===== Test 1: Basic LFU Cache Operations =====');
const cache1 = new LFUCache(3);

cache1.put(1, 'A');
cache1.put(2, 'B');
cache1.put(3, 'C');
cache1.display();

console.log('Get key 1:', cache1.get(1)); // Should return 'A', freq becomes 2
cache1.display();

console.log('Get key 2:', cache1.get(2)); // Should return 'B', freq becomes 2
cache1.display();

cache1.put(4, 'D'); // Should evict key 3 (freq 1, least recent)
console.log('After putting key 4 with value D:');
cache1.display();

console.log('Get key 3 (should be -1):', cache1.get(3)); // Should return -1

console.log('\n===== Test 2: LFU Eviction =====');
const cache2 = new LFUCache(2);

cache2.put(1, 'A');
cache2.put(2, 'B');
cache2.display();

cache2.get(1); // key 1 freq becomes 2
console.log('After getting key 1:');
cache2.display();

cache2.put(3, 'C'); // Should evict key 2 (freq 1)
console.log('After putting key 3 with value C (should evict key 2):');
cache2.display();

console.log('Get key 2 (should be -1):', cache2.get(2)); // Should return -1
console.log('Get key 1:', cache2.get(1)); // Should return 'A'
console.log('Get key 3:', cache2.get(3)); // Should return 'C'

console.log('\n===== Test 3: Update Existing Key =====');
const cache3 = new LFUCache(2);

cache3.put(1, 'A');
cache3.put(2, 'B');
cache3.display();

cache3.put(1, 'X'); // Update key 1
console.log('After updating key 1 to X:');
cache3.display();

cache3.put(3, 'C'); // Should evict key 2
console.log('After putting key 3 (should evict key 2):');
cache3.display();

console.log('Get key 1:', cache3.get(1)); // Should return 'X'
console.log('Get key 2 (should be -1):', cache3.get(2)); // Should return -1
console.log('Get key 3:', cache3.get(3)); // Should return 'C'

console.log('\n===== Test 4: Capacity Zero =====');
const cache4 = new LFUCache(0);
cache4.put(1, 'A');
console.log('Get key 1 (capacity 0, should be -1):', cache4.get(1)); // Should return -1

console.log('\n===== Test 5: Complex Access Pattern =====');
const cache5 = new LFUCache(3);

cache5.put(1, 'A');
cache5.put(2, 'B');
cache5.put(3, 'C');
cache5.get(1); // A: freq 2
cache5.get(2); // B: freq 2
cache5.get(3); // C: freq 2
cache5.display();

cache5.put(4, 'D'); // All have freq 2, evict least recent (A)
console.log('After putting key 4 (should evict key 1 - least recent among same freq):');
cache5.display();

console.log('Get key 1 (should be -1):', cache5.get(1));
console.log('Get key 2:', cache5.get(2));
console.log('Get key 3:', cache5.get(3));
console.log('Get key 4:', cache5.get(4));