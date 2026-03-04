// LRU Cache Implementation using Double Linked List

class LRUNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.size = 0;
    
    // Dummy head and tail for easy insertion/deletion
    this.head = new LRUNode(null, null);
    this.tail = new LRUNode(null, null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
    
    // Map key to node for O(1) lookup
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return -1;
    }

    // Get the node
    const node = this.cache.get(key);
    
    // Move to front (most recently used)
    this.moveToFront(node);
    
    return node.value;
  }

  put(key, value) {
    if (this.capacity === 0) return;

    // If key exists, update value and move to front
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = value;
      this.moveToFront(node);
      return;
    }

    // If at capacity, evict LRU item
    if (this.size >= this.capacity) {
      this.evict();
    }

    // Create new node
    const newNode = new LRUNode(key, value);
    
    // Add to cache and front of list
    this.cache.set(key, newNode);
    this.addToFront(newNode);
    this.size++;
  }

  addToFront(node) {
    // Insert right after head
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  removeNode(node) {
    // Remove node from linked list
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  moveToFront(node) {
    // Remove node from current position and add to front
    this.removeNode(node);
    this.addToFront(node);
  }

  evict() {
    // Remove LRU node (node before tail)
    const lruNode = this.tail.prev;
    
    // Remove from linked list
    this.removeNode(lruNode);
    
    // Remove from cache
    this.cache.delete(lruNode.key);
    
    this.size--;
  }

  // Helper method to display cache state (for debugging)
  display() {
    console.log(`=== LRU Cache (Size: ${this.size}/${this.capacity}) ===`);
    console.log('Cache order (MRU -> LRU):');
    
    let curr = this.head.next;
    while (curr !== this.tail) {
      console.log(`  [${curr.key}: ${curr.value}]`);
      curr = curr.next;
    }
    console.log('');
  }
}

// ============== TEST CASES ==============

console.log('===== Test 1: Basic LRU Cache Operations =====');
const cache1 = new LRUCache(3);

cache1.put(1, 'A');
cache1.put(2, 'B');
cache1.put(3, 'C');
cache1.display();

console.log('Get key 1:', cache1.get(1)); // Should return 'A', becomes MRU
cache1.display();

cache1.put(4, 'D'); // Should evict key 2 (LRU)
console.log('After putting key 4 with value D:');
cache1.display();

console.log('Get key 2 (should be -1):', cache1.get(2)); // Should return -1

console.log('\n===== Test 2: LRU Eviction Order =====');
const cache2 = new LRUCache(2);

cache2.put(1, 'A');
cache2.put(2, 'B');
cache2.display();

cache2.get(1); // key 1 becomes MRU
console.log('After getting key 1:');
cache2.display();

cache2.put(3, 'C'); // Should evict key 2 (LRU)
console.log('After putting key 3 (should evict key 2):');
cache2.display();

console.log('Get key 2 (should be -1):', cache2.get(2)); // Should return -1
console.log('Get key 1:', cache2.get(1)); // Should return 'A'
console.log('Get key 3:', cache2.get(3)); // Should return 'C'

console.log('\n===== Test 3: Update Existing Key =====');
const cache3 = new LRUCache(2);

cache3.put(1, 'A');
cache3.put(2, 'B');
cache3.display();

cache3.put(1, 'X'); // Update key 1, becomes MRU
console.log('After updating key 1 to X:');
cache3.display();

cache3.put(3, 'C'); // Should evict key 2 (still LRU)
console.log('After putting key 3 (should evict key 2):');
cache3.display();

console.log('Get key 1:', cache3.get(1)); // Should return 'X'
console.log('Get key 2 (should be -1):', cache3.get(2)); // Should return -1
console.log('Get key 3:', cache3.get(3)); // Should return 'C'

console.log('\n===== Test 4: Capacity Zero =====');
const cache4 = new LRUCache(0);
cache4.put(1, 'A');
console.log('Get key 1 (capacity 0, should be -1):', cache4.get(1)); // Should return -1

console.log('\n===== Test 5: Sequential Access Pattern =====');
const cache5 = new LRUCache(3);

cache5.put(1, 'A');
cache5.put(2, 'B');
cache5.put(3, 'C');
cache5.display();

cache5.get(1); // A: MRU
cache5.get(2); // B: MRU
cache5.get(3); // C: MRU
cache5.display();

cache5.put(4, 'D'); // Evicts A (LRU)
console.log('After putting key 4 (should evict key 1 - LRU):');
cache5.display();

console.log('Get key 1 (should be -1):', cache5.get(1));
console.log('Get key 2:', cache5.get(2));
console.log('Get key 3:', cache5.get(3));
console.log('Get key 4:', cache5.get(4));

console.log('\n===== Test 6: Repeated Access =====');
const cache6 = new LRUCache(2);

cache6.put(1, 'A');
cache6.put(2, 'B');
cache6.display();

// Repeatedly access key 1
cache6.get(1);
cache6.get(1);
cache6.get(1);
console.log('After accessing key 1 three times:');
cache6.display();

cache6.put(3, 'C'); // Should evict key 2 (not 1, because 1 is frequently used)
console.log('After putting key 3 (should evict key 2):');
cache6.display();

console.log('Get key 1:', cache6.get(1)); // Should return 'A'
console.log('Get key 2 (should be -1):', cache6.get(2)); // Should return -1
console.log('Get key 3:', cache6.get(3)); // Should return 'C'

console.log('\n===== Test 7: Edge Cases =====');
const cache7 = new LRUCache(1);

cache7.put(1, 'A');
cache7.put(2, 'B'); // Evicts A
console.log('After putting keys 1 and 2 (capacity 1):');
cache7.display();

console.log('Get key 1 (should be -1):', cache7.get(1));
console.log('Get key 2:', cache7.get(2));

cache7.put(3, 'C'); // Evicts B
console.log('\nAfter putting key 3:');
cache7.display();

console.log('Get key 2 (should be -1):', cache7.get(2));
console.log('Get key 3:', cache7.get(3));