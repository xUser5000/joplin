import { CommandRuntime, CommandDeclaration } from '../lib/services/CommandService';
const { _ } = require('lib/locale');
const ExternalEditWatcher = require('lib/services/ExternalEditWatcher');

interface Props {
	noteId: string
}

export const declaration:CommandDeclaration = {
	name: 'stopExternalEditing',
	label: () => _('Stop external editing'),
	iconName: 'fa-stop',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async (props:Props) => {
			ExternalEditWatcher.instance().stopWatching(props.noteId);
		},
	};
};
