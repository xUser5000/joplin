import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const Note = require('lib/models/Note');
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'showNoteContentProperties',
	label: () => _('Statistics...'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ noteId }:any) => {
			const note = await Note.load(noteId);
			if (note) {
				comp.setState({
					noteContentPropertiesDialogOptions: {
						visible: true,
						text: note.body,
					},
				});
			}
		},
	};
};
