import {createForgeCaptureGateway} from './wealth-vendor/forge-gateway.mjs';
import {makeWealthAuthority} from './wealth-authorization.mjs';
import {validateWealthConfig} from './wealth-config.mjs';

export function makeWealthAppHandler({issuer,operatorSubject,config,resourcesEnabled=false,registry,loadManifest,credentials,fetcher}) {
 if(config)validateWealthConfig(config);
 const enabled=resourcesEnabled===true&&config?.enabled===true;
 const binding=enabled?{issuer,origin:config.origin,expert_id:config.expert_id,resource_id:config.resource_id,
  catalog_sha256:config.catalog_sha256,source_commit:config.source_commit}:undefined;
 const authority=makeWealthAuthority({issuer,operatorSubject,registry,loadManifest,binding,tenantBindings:config?.tenant_bindings});
 const gateway=createForgeCaptureGateway({enabled,config:binding,verifyIdentity:authority.verifyIdentity,
  authorize:authority.authorize,tenantFor:authority.tenantFor,credentials,...(fetcher?{fetcher}:{})});
 return {available:authority.available,handle:gateway.handle};
}
