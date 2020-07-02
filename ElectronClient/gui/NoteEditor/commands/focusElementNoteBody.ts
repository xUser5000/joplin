import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';

export const declaration:CommandDeclaration = {
	name: 'focusElementNoteBody',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			comp.editorRef.current.execCommand({ name: 'focus' });
		},
		// isEnabled: (props:any):boolean => {
		// 	return props.sidebarVisibility;
		// },
		// mapStateToProps: (state:any):any => {
		// 	return {
		// 		sidebarVisibility: state.sidebarVisibility,
		// 	};
		// },
	};
};
