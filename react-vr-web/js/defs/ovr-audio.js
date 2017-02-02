declare module 'ovr-audio' {
  declare type AudioConfig = {
    panningModel?: string,
    distanceModel?: string,
    coneInnerAngle?: number,
    coneOuterAngle?: number,
    coneOuterGain?: number,
  };

  declare type StreamingType = 'buffer'; // Extend this when more are added

  declare type AudioDef = {
    streamingType: StreamingType,
    src?: string,
  };

  declare class VRAudioBufferSource {

  }

  declare class VRAudioComponent {
    onMediaReady: void | () => void;
    onMediaEnded: void | () => void;

    constructor(context: VRAudioContext, config: AudioConfig): VRAudioComponent;
    setAudio(AudioDef): void;
    play(): void;
    stop(): void;
    dispose(): void;
  }

  declare class VRAudioContext {
    frame(camera: any): void;
  }
}
