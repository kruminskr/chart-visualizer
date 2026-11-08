// Hands a file dropped on the dashboard to the project page. Client-side navigation keeps module state.
let pending = null;
export const setPendingFile = f => { pending = f; };
export const takePendingFile = () => { const f = pending; pending = null; return f; };
