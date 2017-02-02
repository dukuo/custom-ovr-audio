declare module 'three' {
  declare var ClampToEdgeWrapping: any;
  declare var DefaultLoadingManager: any;
  declare var FlatShading: number;
  declare var RepeatWrapping: any;
  declare var SmoothShading: number;

  declare class Box3 {
    max: Vector3;
    min: Vector3;

    constructor(): Box3;
    setFromObject(obj: any): void;
  }

  declare class BoxGeometry extends Geometry {
    constructor(number, number, number, number, number, number): BoxGeometry;
  }

  declare class BufferAttribute {
    constructor(): BufferAttribute;
  }

  declare class BufferGeometry extends Geometry {
    constructor(): BufferGeometry;
    addAttribute(name: string, attr: BufferAttribute): void;
    addGroup(start: number, length: number, index: number): void;
    computeVertexNormals(): void;
    setIndex(attr: BufferAttribute): void;
  }

  declare class Color {
    constructor(): Color;
  }

  declare class Geometry {

  }

  declare class Group {
    constructor(): Group;
    add(child: any): void;
  }

  declare class Material {
    opacity: number;
    shading: number;
    transparent: boolean;
    url: string;
  }

  declare class Mesh {
    name: string;

    constructor(geom: Geometry, material: Material): Mesh;
  }

  declare class MeshBasicMaterial extends Material {
    constructor(): MeshBasicMaterial;
  }

  declare class MeshLambertMaterial extends Material {
    constructor(): MeshLambertMaterial;
  }

  declare class MeshPhongMaterial extends Material {
    constructor(): MeshPhongMaterial;
  }

  declare class MultiMaterial extends Material {
    constructor(multi: Array<any>): MultiMaterial;
  }

  declare class TextureLoader {
    constructor(loader: any): TextureLoader;
    load(path: string): any;
    setCrossOrigin(flag: boolean): void;
  }

  declare class Vector2 {
    constructor(x: number, y: number): Vector2;
  }

  declare class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x: number, y: number, z: number): Vector3;
  }
}
