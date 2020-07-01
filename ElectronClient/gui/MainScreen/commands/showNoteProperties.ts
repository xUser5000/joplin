import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';

export const declaration:CommandDeclaration = {
	name: 'showNoteProperties',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ noteId, onRevisionLinkClick }:any) => {
			comp.setState({
				notePropertiesDialogOptions: {
					noteId: noteId,
					visible: true,
					onRevisionLinkClick: onRevisionLinkClick,
				},
			});
		},
	};
};
