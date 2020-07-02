import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';

export const declaration:CommandDeclaration = {
	name: 'focusElementNoteTitle',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			if (!comp.titleInputRef.current) return;
			comp.titleInputRef.current.focus();
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
