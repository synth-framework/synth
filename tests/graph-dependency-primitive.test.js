// ============================================================
// DEPENDENCY-GRAPH PRIMITIVE TESTS (EXP-GRAPH-001)
// ============================================================
// Tests the generic DAG primitive defined in
// docs/design/shared-dependency-graph.md.
// ============================================================

import { strict as assert } from "assert"
import {
  buildAdjacencyLists,
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
  assert.deepEqual(result.order, ["a", "b", "x", "y"])
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
  const dependsOnResult = topologicalSort(graph, ["depends_on"])
  assert.equal(dependsOnResult.ok, true)
  assert.deepEqual(dependsOnResult.order, ["a", "b", "c"])

  const allTypesResult = topologicalSort(graph, ["depends_on", "contains"])
  assert.equal(allTypesResult.ok, true)
  assert.deepEqual(allTypesResult.order, ["a", "b", "c"])
  console.log("  [PASS] edge type filtering")
}

console.log("\n=== Dependency-Graph Primitive Tests ===\n")

testBuildAdjacencyLists()
testTopologicalSortAcyclic()
testTopologicalSortCyclic()
testTopologicalSortDeterministic()
testDetectCyclesNoCycles()
testDetectCyclesSimpleCycle()
testDetectCyclesDeterministic()
testIsAcyclic()
testReachableFrom()
testEmptyGraph()
testDisconnectedGraph()
testEdgeTypeFiltering()

console.log("\n=== All dependency-graph primitive tests passed ===\n")
