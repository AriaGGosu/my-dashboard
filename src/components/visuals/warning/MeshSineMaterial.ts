/**
 * Material con deformación sinusoidal en el vertex (estilo cono del zip).
 * Paul West @prisoner849 - portado desde el ejemplo del zip.
 */
import * as THREE from "three";

export class MeshSineMaterial extends THREE.MeshBasicMaterial {
  time: { value: number };

  constructor(parameters: THREE.MeshBasicMaterialParameters = {}) {
    super(parameters);
    this.time = { value: 0 };
  }

  onBeforeCompile(shader: THREE.Shader) {
    shader.uniforms.time = this.time;
    shader.vertexShader = `
      uniform float time;
      ${shader.vertexShader}
    `;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "vec3 transformed = vec3(position.x, position.y + sin(time + uv.x * 3.14159 * 4.0) / 4.0, position.z);"
    );
  }
}
