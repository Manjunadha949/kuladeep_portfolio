import {getPasswordOwner} from './owner-auth';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {cookieName,validSession,safeReturn} from '../lib/owner-session.mjs';
export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
export async function getOwnerUser(){return getPasswordOwner()}
