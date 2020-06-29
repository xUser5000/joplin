import { CommandDeclaration } from '../../lib/services/CommandService';
const { _ } = require('lib/locale');

const declaration:CommandDeclaration = {
	name: 'toggleSidebar',
	label: () => _('Toggle sidebar'),
	iconName: 'fa-bars',
};

export default declaration;
