export function makeResourceStorage(options:{client:any;bucket:string|undefined;sign:any}):{loadManifest:()=>Promise<any>;describeArtifact:(artifact:any)=>Promise<any>};
