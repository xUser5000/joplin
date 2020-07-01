import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';

export const declaration:CommandDeclaration = {
	name: 'showNoteProperties',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ noteIds }:any) => {
			comp.setState({
				shareNoteDialogOptions: {
					noteIds: noteIds,
					visible: true,
				},
			});
		},
	};
};
