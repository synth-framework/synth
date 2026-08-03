// ============================================================
// DEPENDENCY-GRAPH PRIMITIVE TESTS (EXP-GRAPH-001)
// ============================================================
// Tests the generic DAG primitive defined in
// docs/design/shared-dependency-graph.md.
// ============================================================

import { strict as assert } from "assert"
import {
  buildAdjacencyLists,
  buildGraph,
  detectCycles,
  isAcyclic,
  reachableFrom,
  topologicalSort,
} from "../dist/graph/dependency-graph.js"

function makeGraph(nodes, edges) {
  const nodeMap = new Map()
  for (const [id, payload] of nodes) {
    nodeMap.set(id, { id, payload })
  }
  return { nodes: nodeMap, edges }
}

function testBuildAdjacencyLists() {
  const graph = makeGraph(
    [
      ["a", {}],
      ["b", {}],
      ["c", {}],
    ],
    [
      { from: "a", to: "b", type: "depends_on" },
      { from: "b", to: "c", type: "depends_on" },
    ],
  )
  const { inbound, outbound } = buildAdjacencyLists(graph)
  assert.deepEqual(outbound.get("a"), new Set(["b"]))
  assert.deepEqual(outbound.get("b"), new Set(["c"]))
  assert.deepEqual(outbound.get("c"), new Set())
  assert.deepEqual(inbound.get("a"), new Set())
  assert.deepEqual(inbound.get("b"), new Set(["a"]))
  assert.deepEqual(inbound.get("c"), new Set(["b"]))
  console.log("  [PASS] buildAdjacencyLists")
}

function testTopologicalSortAcyclic() {
  const graph = makeGraph(
    [
      ["a", {}],
      ["b", {}],
      ["c", {}],
    ],
    [
      { from: "a", to: "b", type: "depends_on" },
      { from: "b", to: "c", type: "depends_on" },
    ],
  )
  const result = topologicalSort(graph)
  assert.equal(result.ok, true)
  assert.deepEqual(result.order, ["a", "b", "c"])
  console.log("  [PASS] topologicalSort: acyclic graph")
}

function testTopologicalSortCyclic() {
  const graph = makeGraph(
    [
      ["a", {}],
      ["b", {}],
      ["c", {}],
    ],
    [
      { from: "a", to: "b", type: "depends_on" },
      { from: "b", to: "c", type: "depends_on" },
      { from: "c", to: "a", type: "depends_on" },
    ],
  )
  const result = topologicalSort(graph)
  assert.equal(result.ok, false)
  assert.ok(result.cycle.length > 0)
  console.log("  [PASS] topologicalSort: cyclic graph returns cycle")
}

function testTopologicalSortDeterministic() {
  const graph = makeGraph(
    [
      ["a", {}],
      ["b", {}],
      ["c", {}],
      ["d", {}],
    ],
    [
      { from: "a", to: "c", type: "depends_on" },
      { from: "b", to: "c", type: "depends_on" },
      { from: "c", to: "d", type: "depends_on" },
    ],
  )
  const result1 = topologicalSort(graph)
  const result2 = topologicalSort(graph)
  assert.deepEqual(result1, result2)
  assert.equal(result1.ok, true)
  assert.deepEqual(result1.order, ["a", "b", "c", "d"])
  console.log("  [PASS] topologicalSort: deterministic")
}

function testDetectCyclesNoCycles() {
  const graph = makeGraph(
    [
      ["a", {}],
      ["b", {}],
      ["c", {}],
    ],
    [
      { from: "a", to: "b", type: "depends_on" },
      { from: "b", to: "c", type: "depends_on" },
    ],
  )
  const cycles = detectCycles(graph)
  assert.deepEqual(cycles, [])
  console.log("  [PASS] detectCycles: no cycles")
}

function testDetectCyclesSimpleCycle() {
  const graph = makeGraph(
    [
      ["a", {}],
      ["b", {}],
      ["c", {}],
    ],
    [
      { from: "a", to: "b", type: "depends_on" },
      { from: "b", to: "c", type: "depends_on" },
      { from: "c", to: "a", type: "depends_on" },
    ],
  )
  const cycles = detectCycles(graph)
  assert.equal(cycles.length, 1)
  assert.deepEqual(cycles[0], ["a", "b", "c"])
  console.log("  [PASS] detectCycles: simple cycle")
}

function testDetectCyclesDeterministic() {
  const graph = makeGraph(
    [
      ["a", {}],
      ["b", {}],
      ["c", {}],
    ],
    [
      { from: "a", to: "b", type: "depends_on" },
      { from: "b", to: "c", type: "depends_on" },
      { from: "c", to: "a", type: "depends_on" },
    ],
  )
  const cycles1 = detectCycles(graph)
  const cycles2 = detectCycles(graph)
  assert.deepEqual(cycles1, cycles2)
  console.log("  [PASS] detectCycles: deterministic")
}

function testIsAcyclic() {
  const acyclic = makeGraph(
    [
      ["a", {}],
      ["b", {}],
    ],
    [{ from: "a", to: "b", type: "depends_on" }],
  )
  assert.equal(isAcyclic(acyclic), true)

  const cyclic = makeGraph(
    [
      ["a", {}],
      ["b", {}],
    ],
    [
      { from: "a", to: "b", type: "depends_on" },
      { from: "b", to: "a", type: "depends_on" },
    ],
  )
  assert.equal(isAcyclic(cyclic), false)
  console.log("  [PASS] isAcyclic")
}

function testReachableFrom() {
  const graph = makeGraph(
    [
      ["a", {}],
      ["b", {}],
      ["c", {}],
      ["d", {}],
    ],
    [
      { from: "a", to: "b", type: "depends_on" },
      { from: "b", to: "c", type: "depends_on" },
      { from: "d", to: "c", type: "depends_on" },
    ],
  )
  const reachable = reachableFrom(graph, "a")
  assert.deepEqual(reachable, new Set(["a", "b", "c"]))
  console.log("  [PASS] reachableFrom")
}

function testEmptyGraph() {
  const graph = makeGraph([], [])
  assert.deepEqual(topologicalSort(graph), { ok: true, order: [] })
  assert.deepEqual(detectCycles(graph), [])
  assert.equal(isAcyclic(graph), true)
  assert.deepEqual(reachableFrom(graph, "missing"), new Set())
  console.log("  [PASS] empty graph")
}

function testDisconnectedGraph() {
  const graph = makeGraph(
    [
      ["a", {}],
      ["b", {}],
      ["x", {}],
      ["y", {}],
    ],
    [
      { from: "a", to: "b", type: "depends_on" },
      { from: "x", to: "y", type: "depends_on" },
    ],
  )
  const result = topologicalSort(graph)
  assert.equal(result.ok, true)
  assert.equal(result.order.length, 4)
  // Input order is a, b, x, y. The two chains are independent; nodes are
  // emitted in first-discovered order: a, then x (the next initial root),
  // then their respective dependents b and y.
  assert.deepEqual(result.order, ["a", "x", "b", "y"])
  console.log("  [PASS] disconnected graph")
}

function testEdgeTypeFiltering() {
  const graph = makeGraph(
    [
      ["a", {}],
      ["b", {}],
      ["c", {}],
    ],
    [
      { from: "a", to: "b", type: "depends_on" },
      { from: "b", to: "c", type: "contains" },
    ],
  )
  // With only depends_on edges, c has no inbound edges and is emitted as
  // soon as it is discovered (right after a), before b becomes eligible.
  const dependsOnResult = topologicalSort(graph, ["depends_on"])
  assert.equal(dependsOnResult.ok, true)
  assert.deepEqual(dependsOnResult.order, ["a", "c", "b"])

  // With all edge types included, the chain a -> b -> c is respected.
  const allTypesResult = topologicalSort(graph, ["depends_on", "contains"])
  assert.equal(allTypesResult.ok, true)
  assert.deepEqual(allTypesResult.order, ["a", "b", "c"])
  console.log("  [PASS] edge type filtering")
}

function testDefaultEdgeTypeIncludesAll() {
  const graph = makeGraph(
    [
      ["a", {}],
      ["b", {}],
    ],
    [
      { from: "a", to: "b", type: "contains" },
      { from: "b", to: "a", type: "contains" },
    ],
  )
  assert.equal(isAcyclic(graph), false, "default should consider all edge types")
  assert.equal(isAcyclic(graph, ["depends_on"]), true, "depends_on filter should ignore contains cycle")
  console.log("  [PASS] default edge type includes all edges")
}

function testBuildGraphValid() {
  const graph = buildGraph({
    nodes: [
      { id: "a", payload: 1 },
      { id: "b", payload: 2 },
    ],
    edges: [{ from: "a", to: "b", type: "depends_on" }],
  })
  assert.equal(graph.nodes.size, 2)
  assert.equal(graph.nodes.get("a").payload, 1)
  assert.equal(graph.edges.length, 1)
  console.log("  [PASS] buildGraph: valid graph")
}

function testBuildGraphDuplicateNodeThrows() {
  assert.throws(
    () =>
      buildGraph({
        nodes: [
          { id: "a", payload: 1 },
          { id: "a", payload: 2 },
        ],
        edges: [],
      }),
    /Duplicate node id/,
  )
  console.log("  [PASS] buildGraph: duplicate node throws")
}

function testBuildGraphUnknownEdgeThrows() {
  assert.throws(
    () =>
      buildGraph({
        nodes: [{ id: "a", payload: 1 }],
        edges: [{ from: "a", to: "missing", type: "depends_on" }],
      }),
    /Edge references unknown node/,
  )
  console.log("  [PASS] buildGraph: unknown edge throws")
}

function testTopologicalSortInputOrder() {
  const graph = makeGraph(
    [
      ["b", {}],
      ["a", {}],
      ["d", {}],
      ["c", {}],
    ],
    [
      { from: "a", to: "c", type: "depends_on" },
      { from: "b", to: "c", type: "depends_on" },
      { from: "c", to: "d", type: "depends_on" },
    ],
  )
  const result = topologicalSort(graph)
  assert.equal(result.ok, true)
  // Input node order is b, a, d, c. b and a are eligible first (in that order),
  // then c, then d. A purely alphabetical sort would have produced a, b, c, d.
  assert.deepEqual(result.order, ["b", "a", "c", "d"])
  console.log("  [PASS] topologicalSort: preserves input order over alphabetical")
}

function testDetectCyclesMultipleDisconnected() {
  const graph = makeGraph(
    [
      ["a", {}],
      ["b", {}],
      ["c", {}],
      ["d", {}],
    ],
    [
      { from: "a", to: "b", type: "depends_on" },
      { from: "b", to: "a", type: "depends_on" },
      { from: "c", to: "d", type: "depends_on" },
      { from: "d", to: "c", type: "depends_on" },
    ],
  )
  const cycles = detectCycles(graph)
  assert.equal(cycles.length, 2)
  assert.deepEqual(cycles[0], ["a", "b"])
  assert.deepEqual(cycles[1], ["c", "d"])
  console.log("  [PASS] detectCycles: multiple disconnected cycles")
}

function testReachableFromMissingStart() {
  assert.deepEqual(
    reachableFrom(makeGraph([["a", {}]], []), "missing"),
    new Set(),
  )
  console.log("  [PASS] reachableFrom: missing start returns empty set")
}

console.log("\n=== Dependency-Graph Primitive Tests ===\n")

testBuildAdjacencyLists()
testTopologicalSortAcyclic()
testTopologicalSortCyclic()
testTopologicalSortDeterministic()
testTopologicalSortInputOrder()
testDetectCyclesNoCycles()
testDetectCyclesSimpleCycle()
testDetectCyclesDeterministic()
testDetectCyclesMultipleDisconnected()
testIsAcyclic()
testReachableFrom()
testReachableFromMissingStart()
testEmptyGraph()
testDisconnectedGraph()
testEdgeTypeFiltering()
testDefaultEdgeTypeIncludesAll()
testBuildGraphValid()
testBuildGraphDuplicateNodeThrows()
testBuildGraphUnknownEdgeThrows()

console.log("\n=== All dependency-graph primitive tests passed ===\n")
