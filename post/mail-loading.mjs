import {escapeHtml} from '../domain.mjs';
export function mailLoading(label='Opening reply…'){
 return '<div class="mail-opening" role="status" aria-live="polite" aria-busy="true"><span>'+escapeHtml(label)+'</span><span class="mail-loading-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>';
}
