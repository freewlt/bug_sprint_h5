type AnyEditorEnv = {
  BuildTask?: {
    start(platform: string, destPath?: string): {
      destPath: string;
      waitForCompletion(): Promise<number>;
    };
  };
  BuildTaskStatus?: {
    Success?: number;
  };
  regClass?: () => ClassDecorator;
};

class BuildWebCli {
  static async run(destPath = "") {
    const editorEnv = (globalThis as any).IEditorEnv as AnyEditorEnv | undefined;
    if (!editorEnv?.BuildTask) {
      throw new Error("IEditorEnv.BuildTask is not available.");
    }

    const outputPath = destPath.trim();
    console.log(`[BuildWebCli] Start LayaAir IDE web build: ${outputPath || "(default)"}`);

    const task = outputPath
      ? editorEnv.BuildTask.start("web", outputPath)
      : editorEnv.BuildTask.start("web");
    const status = await task.waitForCompletion();
    const successStatus = editorEnv.BuildTaskStatus?.Success ?? 1;

    console.log(`[BuildWebCli] Build finished: status=${status}, destPath=${task.destPath}`);
    if (status !== successStatus) {
      throw new Error(`LayaAir IDE web build failed with status ${status}.`);
    }

    return {
      status,
      destPath: task.destPath,
    };
  }
}

const editorEnv = (globalThis as any).IEditorEnv as AnyEditorEnv | undefined;
if (editorEnv?.regClass) {
  editorEnv.regClass()(BuildWebCli);
}

export {};
