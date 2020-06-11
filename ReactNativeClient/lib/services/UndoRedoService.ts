import AsyncActionQueue from '../AsyncActionQueue';

export default class UndoRedoService {

	private pushAsyncQueue:AsyncActionQueue = new AsyncActionQueue(1000);
	private baseState:any = null;
	private undoStates:any[] = [];
	private redoStates:any[] = [];

	constructor(baseState:any) {
		this.baseState = baseState;
	}

	push(state:any) {
		this.undoStates.push(state);
		this.redoStates = [];
	}

	schedulePush(state:any) {
		this.pushAsyncQueue.push(() => {
			return async () => {
				this.push(state);
			};
		});
	}

	reset() {
		this.pushAsyncQueue.reset();
	}

	undo() {
		if (!this.canUndo) throw new Error('Nothing to undo');
		const state = this.undoStates.pop();
		this.redoStates.push(state);
		return this.currentState;
	}

	redo() {
		if (!this.canRedo) throw new Error('Nothing to redo');
		const state = this.redoStates.pop();
		this.undoStates.push(state);
		return this.currentState;
	}

	private get currentState():any {
		return this.undoStates.length ? this.undoStates[this.undoStates.length - 1] : this.baseState;
	}

	get canUndo():boolean {
		return !!this.undoStates.length;
	}

	get canRedo():boolean {
		return !!this.redoStates.length;
	}

}
