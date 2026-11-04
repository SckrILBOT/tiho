// Shared browser adapter: override its path when the skill is installed elsewhere.
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const adapter=process.env.TIHO_BROWSER_ADAPTER || join(homedir(),'.agents','skills','design-taste-frontend','scripts','lib','cdp.mjs');
export const {Browser,sleep}=await import(pathToFileURL(resolve(adapter)).href);
export const localSiteUrl=new URL('../public/index.html',import.meta.url).href;
