import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const NoteListUtils = require('../../utils/NoteListUtils');
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'stopExternalEditing',
	label: () => _('Watching...'),
	iconName: 'fa-share-square',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			NoteListUtils.stopExternalEditing(comp.formNote.id);
		},
	};
};
