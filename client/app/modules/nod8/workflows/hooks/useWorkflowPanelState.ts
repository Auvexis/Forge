import { useState, useCallback } from "react";

/**
 * Manages the mutually-exclusive panel state within the WorkflowEditor.
 * Only one panel (add node, settings, run, logs, node editor) can be open at a time.
 */
export const useWorkflowPanelState = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  const closeAllPanels = useCallback(() => {
    setSelectedNodeId(null);
    setIsAddingNode(false);
    setIsEditingSettings(false);
    setIsRunningWorkflow(false);
    setIsLogsOpen(false);
  }, []);

  const openNodeEditor = useCallback((nodeId: string) => {
    setIsAddingNode(false);
    setIsEditingSettings(false);
    setIsRunningWorkflow(false);
    setIsLogsOpen(false);
    setSelectedNodeId(nodeId);
  }, []);

  const openAddNode = useCallback(() => {
    setSelectedNodeId(null);
    setIsEditingSettings(false);
    setIsRunningWorkflow(false);
    setIsLogsOpen(false);
    setIsAddingNode(true);
  }, []);

  const openSettings = useCallback(() => {
    setSelectedNodeId(null);
    setIsAddingNode(false);
    setIsRunningWorkflow(false);
    setIsLogsOpen(false);
    setIsEditingSettings(true);
  }, []);

  const openRun = useCallback(() => {
    setSelectedNodeId(null);
    setIsAddingNode(false);
    setIsEditingSettings(false);
    setIsLogsOpen(false);
    setIsRunningWorkflow(true);
  }, []);

  const toggleLogs = useCallback(() => {
    setSelectedNodeId(null);
    setIsAddingNode(false);
    setIsRunningWorkflow(false);
    setIsEditingSettings(false);
    setIsLogsOpen((prev) => !prev);
  }, []);

  return {
    selectedNodeId,
    setSelectedNodeId,
    isAddingNode,
    setIsAddingNode,
    isEditingSettings,
    setIsEditingSettings,
    isRunningWorkflow,
    setIsRunningWorkflow,
    isLogsOpen,
    setIsLogsOpen,
    closeAllPanels,
    openNodeEditor,
    openAddNode,
    openSettings,
    openRun,
    toggleLogs,
  };
};
