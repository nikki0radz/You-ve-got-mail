import {phoneCache} from './phone-cache.mjs';
import {practiceCode,incomingRequests,withPracticeFriend} from './friend-state.mjs';
export {incomingRequests} from './friend-state.mjs';
const key='pigeon.friend-request.practice';
let practice;
function storedPractice(){
 if(practice!==undefined)return practice;
 try{practice=JSON.parse(localStorage.getItem(key)||'null');}catch{practice=null;}
 return practice;
}
function change(value){
 practice=value;
 try{if(value)localStorage.setItem(key,JSON.stringify(value));else localStorage.removeItem(key);}catch{}
 window.dispatchEvent(new Event('friend-requests-changed'));
}
function nativeAction(action){
 try{if(JSON.parse(window.Pigeon?.deliveryPrefs?.()||'{}').friendRequestNotifications)window.Pigeon.settingsAction(action);}catch{}
}
export function friendsDirectory(){return withPracticeFriend(phoneCache.friends(),storedPractice());}
export function pendingFriendRequests(){return incomingRequests(friendsDirectory());}
export function simulateFriendRequest(){
 change({status:'pending',id:crypto.randomUUID()});nativeAction('simulateFriendRequest');
}
export function clearFriendSimulation(){change(null);nativeAction('clearFriendRequestSimulation');}
export function respondToPractice(code,accepted){
 if(code!==practiceCode)return false;
 change(accepted?{...storedPractice(),status:'accepted'}:null);nativeAction('clearFriendRequestSimulation');return true;
}
