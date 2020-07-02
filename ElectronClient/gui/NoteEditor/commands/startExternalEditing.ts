import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const NoteListUtils = require('../../utils/NoteListUtils');
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'startExternalEditing',
	label: () => _('Edit in external editor'),
	iconName: 'fa-share-square',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			await comp.saveNoteAndWait(comp.formNote);
			NoteListUtils.startExternalEditing(comp.formNote.id);
		},
	};
};
