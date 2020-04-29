import { useCallback, useState, useEffect } from 'react';
import { clearResourceCache, attachedResources } from './resourceHandling';
const ResourceFetcher = require('lib/services/ResourceFetcher.js');
const DecryptionWorker = require('lib/services/DecryptionWorker.js');
const Note = require('lib/models/Note');

interface HookDependencies {
	noteBody: string,
}

export default function useResourceInfos(dependencies:HookDependencies) {
	const { noteBody } = dependencies;

	const [resourceInfos, setResourceInfos] = useState<any>({});

	function installResourceHandling(refreshResourceHandler: Function) {
		ResourceFetcher.instance().on('downloadComplete', refreshResourceHandler);
		ResourceFetcher.instance().on('downloadStarted', refreshResourceHandler);
		DecryptionWorker.instance().on('resourceDecrypted', refreshResourceHandler);
	}

	function uninstallResourceHandling(refreshResourceHandler: Function) {
		ResourceFetcher.instance().off('downloadComplete', refreshResourceHandler);
		ResourceFetcher.instance().off('downloadStarted', refreshResourceHandler);
		DecryptionWorker.instance().off('resourceDecrypted', refreshResourceHandler);
	}

	const refreshResource = useCallback(async function(event) {
		const resourceIds = await Note.linkedResourceIds(noteBody);
		if (resourceIds.indexOf(event.id) >= 0) {
			clearResourceCache();
			setResourceInfos(await attachedResources(noteBody));
		}
	}, [noteBody]);

	useEffect(() => {
		installResourceHandling(refreshResource);

		return () => {
			uninstallResourceHandling(refreshResource);
		};
	}, [refreshResource]);

	return { resourceInfos };
}
