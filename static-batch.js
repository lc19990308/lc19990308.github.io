import { Matrix4, Mesh } from './vendor/three.module.min.js'
import { mergeGeometries } from './vendor/BufferGeometryUtils.js'

// Call only for subtrees whose mesh transforms never animate. Materials stay
// shared, so CanvasTexture updates retain their original lifecycle.
export function batchStaticMeshes(root, excluded = new Set()) {
  const groups = new Map()
  root.updateWorldMatrix(true, true)
  const inverseRoot = root.matrixWorld.clone().invert()

  function collect(object) {
    if (excluded.has(object) || !object.visible) return
    const material = object.material
    const geometry = object.geometry
    if (object.isMesh && !object.isSkinnedMesh && !object.isInstancedMesh &&
      object.children.length === 0 && material && !Array.isArray(material) &&
      !material.transparent && !material.transmission && geometry &&
      !Object.keys(geometry.morphAttributes).length) {
      const schema = Object.entries(geometry.attributes)
        .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized}:${attribute.array.constructor.name}`)
        .sort().join(',')
      const key = `${material.uuid}|${Boolean(geometry.index)}|${schema}|${object.castShadow}|${object.receiveShadow}|${object.renderOrder}|${object.layers.mask}`
      const group = groups.get(key) || []
      group.push(object)
      groups.set(key, group)
    }
    object.children.forEach(collect)
  }
  collect(root)

  let removedMeshes = 0
  let batchCount = 0
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue
    const geometries = meshes.map(mesh => {
      const geometry = mesh.geometry.clone()
      const localTransform = new Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld)
      geometry.applyMatrix4(localTransform)
      return geometry
    })
    const merged = mergeGeometries(geometries, false)
    geometries.forEach(geometry => geometry.dispose())
    if (!merged) continue
    merged.computeBoundingBox()
    merged.computeBoundingSphere()
    const sample = meshes[0]
    const batch = new Mesh(merged, sample.material)
    batch.name = 'static-batch'
    batch.castShadow = sample.castShadow
    batch.receiveShadow = sample.receiveShadow
    batch.renderOrder = sample.renderOrder
    batch.layers.mask = sample.layers.mask
    root.add(batch)
    meshes.forEach(mesh => mesh.removeFromParent())
    removedMeshes += meshes.length - 1
    batchCount += 1
  }
  return { removedMeshes, batchCount }
}
