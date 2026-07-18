export interface CommentPolicy { commentsPageSize?: number; repliesPageSize?: number; replyPreviewSize?: number; maxPage?: number; maxContentLength?: number; maxReportNoteLength?: number; editWindowMs?: number; maxEdits?: number; oneVisualReplyLevel?: boolean; publicHistory?: boolean; tombstoneText?: string; redactedRevisionText?: string; reportReasons?: string[]; }
export interface Actor { id: string; displayName?: string; roles?: string[]; }
export interface Resource { id: string; key?: string; title?: string; commentsCount?: number; }
export interface Revision { id: string; content: string; effectiveAt: Date|string; replacedAt?: Date|string|null; redactedAt?: Date|string|null; }
export interface Comment { id: string; resourceId: string; authorId: string|Actor; parentCommentId?: string|null; replyToCommentId?: string|null; content: string; status?: string; isDeleted?: boolean; createdAt: Date|string; updatedAt: Date|string; editCount?: number; editHistory?: Revision[]; }
export interface Report { id: string; commentId: string; reporterId: string; reason: string; note?: string; snapshot: { content: string; authorId: unknown; revisionAt: Date|string; editCount: number }; }
export interface CommentRepositories { comments: Record<string, Function>; resources: Record<string, Function>; reports?: Record<string, Function>; identities?: Record<string, Function>; counts?: Record<string, Function>; }
export interface WorkflowOptions { policy?: CommentPolicy; repositories: CommentRepositories; clock?: { now(): Date }; ids?: { next(): string }; sanitize?(value:string): string; analyzeSafety?(value:string, context:unknown): unknown; events?: LifecycleBus; }
export interface LifecycleBus { on(name:string, listener:(payload:unknown,name:string)=>void|Promise<void>):()=>void; emit(name:string,payload:unknown):Promise<void>; }
export class ThreadedCommentsError extends Error { code:string; status:number; details?:unknown; }
export function normalizePolicy(policy?:CommentPolicy): Required<CommentPolicy>;
export function createLifecycleBus():LifecycleBus;
export function createThreadedComments(options:WorkflowOptions): Record<string, Function|object>;
export function createMongooseRepositories(options:unknown):CommentRepositories;
export function createExpressCommentsRouter(options:unknown):unknown;
export const LIFECYCLE_EVENTS: Record<string,string>;
export interface ThreadedCommentsWidgetConfig { resourceKey:string; endpointBase:string; authenticated?:boolean; actor?:Actor|null; csrfToken?:string; loginDestination?:string; locale?:string; policy?:CommentPolicy; labels?:Record<string,unknown>; transport?:(url:string, options:RequestInit)=>Promise<unknown>; }
export interface ThreadedCommentsElement extends HTMLElement { configure(config:ThreadedCommentsWidgetConfig):this; load(page?:number, focus?:{thread?:string;reply?:string}):Promise<void>; }
declare global { interface HTMLElementTagNameMap { 'threaded-comments': ThreadedCommentsElement; } }
