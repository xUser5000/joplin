import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'showNoteProperties',
	label: () => _('Note properties'),
	iconName: 'fa-info-circle',
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
