export function makeChatHandler(options: {
 issuer: string | undefined;
 registry: (claims:{sub:string}) => Promise<unknown>;
 db: (table:string,options?:{method?:string;body?:unknown;query?:Record<string,string>}) => Promise<unknown>;
}): (event:unknown) => Promise<{payload:unknown}>;
