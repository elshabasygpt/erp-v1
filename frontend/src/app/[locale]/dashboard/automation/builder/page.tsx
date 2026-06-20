"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { automationApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    ReactFlow,
    Background,
    Controls,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Node,
    Edge,
    Connection,
    Handle,
    Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ─── Custom Nodes ─────────────────────────────────────────────────────────

const TriggerNode = ({ data }: any) => {
    return (
        <div className="bg-white dark:bg-surface-900 border-2 border-emerald-500 rounded-xl shadow-lg w-64">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 border-b border-emerald-100 dark:border-emerald-900/50 rounded-t-xl flex items-center gap-2">
                <span className="text-emerald-600">⚡</span>
                <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">Trigger</span>
            </div>
            <div className="p-4">
                <label className="block text-xs font-semibold text-surface-500 mb-1">When this happens:</label>
                <select className="w-full text-sm p-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-emerald-500">
                    <option value="deal_won">Deal is Won</option>
                    <option value="po_created">Purchase Order Created</option>
                    <option value="customer_added">New Customer Added</option>
                </select>
            </div>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-emerald-500" />
        </div>
    );
};

const ActionNode = ({ data }: any) => {
    return (
        <div className="bg-white dark:bg-surface-900 border-2 border-violet-500 rounded-xl shadow-lg w-64">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-violet-500" />
            <div className="bg-violet-50 dark:bg-violet-900/20 px-4 py-2 border-b border-violet-100 dark:border-violet-900/50 rounded-t-xl flex items-center gap-2">
                <span className="text-violet-600">🚀</span>
                <span className="font-bold text-sm text-violet-700 dark:text-violet-400">Action</span>
            </div>
            <div className="p-4">
                <label className="block text-xs font-semibold text-surface-500 mb-1">Do this:</label>
                <select className="w-full text-sm p-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:border-violet-500">
                    <option value="send_email">Send Email Notification</option>
                    <option value="create_task">Create a Task</option>
                    <option value="draft_po">Draft Purchase Order</option>
                </select>
            </div>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-violet-500" />
        </div>
    );
};

const nodeTypes = {
    triggerNode: TriggerNode,
    actionNode: ActionNode,
};

// ─── Main Builder Component ───────────────────────────────────────────────

const initialNodes: Node[] = [
    { id: '1', type: 'triggerNode', position: { x: 250, y: 50 }, data: { label: 'Trigger' } }
];

export default function AutomationBuilderPage() {
    const { isRTL } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const workflowId = searchParams?.get('id');

    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [name, setName] = useState('New Automation Rule');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (workflowId) {
            loadWorkflow(workflowId);
        }
    }, [workflowId]);

    const loadWorkflow = async (id: string) => {
        try {
            const res = await automationApi.getWorkflow(id);
            const wf = res.data?.data || res.data;
            if (wf) {
                setName(wf.name);
                if (wf.nodes_json?.length > 0) setNodes(wf.nodes_json);
                if (wf.edges_json?.length > 0) setEdges(wf.edges_json);
            }
        } catch (err) {
            toast.error('Failed to load workflow');
        }
    };

    const onNodesChange = useCallback(
        (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );

    const onEdgesChange = useCallback(
        (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    const onConnect = useCallback(
        (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
        []
    );

    const addActionNode = () => {
        const newNode: Node = {
            id: Date.now().toString(),
            type: 'actionNode',
            position: { x: 250, y: nodes.length * 150 + 50 },
            data: { label: 'Action' }
        };
        setNodes((nds) => [...nds, newNode]);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await automationApi.saveWorkflow({
                id: workflowId || undefined,
                name,
                trigger_type: 'deal_won', // Simplification for MVP
                is_active: true,
                nodes_json: nodes,
                edges_json: edges
            });
            toast.success('Workflow saved successfully!');
            router.push('./');
        } catch (err) {
            toast.error('Failed to save workflow');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-[85vh] bg-surface-50 dark:bg-surface-950 rounded-2xl overflow-hidden border border-surface-200 dark:border-surface-800">
            {/* Header */}
            <div className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('./')} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-full transition">
                        ←
                    </button>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="text-xl font-bold bg-transparent outline-none border-b border-transparent focus:border-violet-500 transition px-1"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={addActionNode}
                        className="px-4 py-2 border border-surface-200 dark:border-surface-700 font-medium rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition"
                    >
                        + Add Action
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition shadow-sm disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Workflow'}
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 w-full h-full" dir="ltr">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    className="bg-surface-50 dark:bg-surface-950"
                >
                    <Background color="#ccc" gap={16} />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
}
