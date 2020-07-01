import { CommandDeclaration, CommandRuntime } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'toggleNoteList',
	label: () => _('Toggle note list'),
	iconName: 'fa-align-justify',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			comp.setState({ modalLayer: { visible: false, message: '' } });
		},
	};
};
