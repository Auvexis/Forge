type Item = Record<string, unknown>;

function getKey(item: Item, key: string): string {
  return String(item[key] ?? "");
}

export function createMethods() {
  return {
    async intersect(params: { listA: Item[]; listB: Item[]; matchKey: string }) {
      const { listA, listB, matchKey } = params;
      const setB = new Set(listB.map((i) => getKey(i, matchKey)));
      const result = listA.filter((i) => setB.has(getKey(i, matchKey)));
      return { result, count: result.length };
    },

    async difference(params: { listA: Item[]; listB: Item[]; matchKey: string }) {
      const { listA, listB, matchKey } = params;
      const setB = new Set(listB.map((i) => getKey(i, matchKey)));
      const result = listA.filter((i) => !setB.has(getKey(i, matchKey)));
      return { result, count: result.length };
    },

    async union(params: { listA: Item[]; listB: Item[]; matchKey: string }) {
      const { listA, listB, matchKey } = params;
      const seen = new Set<string>();
      const result: Item[] = [];
      for (const item of [...listA, ...listB]) {
        const k = getKey(item, matchKey);
        if (!seen.has(k)) {
          seen.add(k);
          result.push(item);
        }
      }
      return { result, count: result.length };
    },

    async symmetricDifference(params: { listA: Item[]; listB: Item[]; matchKey: string }) {
      const { listA, listB, matchKey } = params;
      const setA = new Set(listA.map((i) => getKey(i, matchKey)));
      const setB = new Set(listB.map((i) => getKey(i, matchKey)));
      const onlyInA = listA.filter((i) => !setB.has(getKey(i, matchKey)));
      const onlyInB = listB.filter((i) => !setA.has(getKey(i, matchKey)));
      const result = [...onlyInA, ...onlyInB];
      return { result, onlyInA, onlyInB, count: result.length };
    },
  };
}
