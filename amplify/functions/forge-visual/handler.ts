import {makeVisualHandler} from './api.mjs';
import {store,queue} from './storage.mjs';
export const handler=makeVisualHandler({issuer:process.env.COGNITO_ISSUER,store,queue});
