export interface PluginModel {
    id: string;
    icon: string;
    name: string;
    description: string;
    category: string;
    version: string;
    author: string;
    repository: string;
    manifest: Record<string, any>;
    methods: any;
}