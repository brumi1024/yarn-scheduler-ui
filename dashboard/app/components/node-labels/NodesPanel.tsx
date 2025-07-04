import React, { useMemo } from 'react';
import { Monitor, HardDrive, Cpu, X } from 'lucide-react';
import { useSchedulerStore } from '~/store/schedulerStore';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '~/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import type { NodeInfo, NodeToLabelMapping } from '~/lib/types';
import { formatMemory } from '~/lib/utils/formatUtils';

interface NodesPanelProps {
    selectedLabel: string | null;
}

export const NodesPanel: React.FC<NodesPanelProps> = ({ selectedLabel }) => {
    const {
        nodes,
        nodeToLabels,
        nodeLabels,
        assignNodeToLabel,
        isLoading
    } = useSchedulerStore();

    // Create a map of nodeId -> labels for quick lookup
    const nodeLabelsMap = useMemo(() => {
        const map = new Map<string, string[]>();
        nodeToLabels.forEach((mapping: NodeToLabelMapping) => {
            map.set(mapping.nodeId, mapping.nodeLabels);
        });
        return map;
    }, [nodeToLabels]);

    // Filter nodes based on selected label
    const filteredNodes = useMemo(() => {
        if (!selectedLabel) {
            // When no label is selected, show all nodes (this is the "overview" mode)
            return nodes;
        }
        
        return nodes.filter((node: NodeInfo) => {
            const assignedLabels = nodeLabelsMap.get(node.id) || [];
            return assignedLabels.includes(selectedLabel);
        });
    }, [nodes, nodeLabelsMap, selectedLabel]);

    const handleLabelChange = async (nodeId: string, newLabel: string | null) => {
        try {
            await assignNodeToLabel(nodeId, newLabel);
        } catch (error) {
            console.error('Failed to assign node to label:', error);
        }
    };

    const getUtilizationColor = (used: number, total: number): string => {
        const percentage = (used / total) * 100;
        if (percentage < 70) return '';
        if (percentage < 90) return 'text-warning';
        return 'text-destructive';
    };

    const getNodeStateVariant = (state: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (state) {
            case 'RUNNING': return 'default';
            case 'UNHEALTHY': return 'destructive';
            case 'SHUTDOWN': return 'secondary';
            default: return 'outline';
        }
    };

    if (nodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <Monitor className="mb-2 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    No cluster nodes found
                </p>
                <p className="text-xs text-muted-foreground">
                    Node information will appear here when available
                </p>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {selectedLabel ? (
                            <>Nodes with label: <strong>{selectedLabel}</strong> ({filteredNodes.length})</>
                        ) : (
                            <>All cluster nodes ({nodes.length}) - showing default partition and labeled nodes</>
                        )}
                    </p>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Node</TableHead>
                                <TableHead>State</TableHead>
                                <TableHead>Labels</TableHead>
                                <TableHead>Memory</TableHead>
                                <TableHead>Cores</TableHead>
                                <TableHead>Containers</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredNodes.map((node: NodeInfo) => {
                                const assignedLabels = nodeLabelsMap.get(node.id) || [];
                                const totalMemory = node.usedMemoryMB + node.availMemoryMB;
                                const totalCores = node.usedVirtualCores + node.availableVirtualCores;
                                const memoryUsedPercent = (node.usedMemoryMB / totalMemory) * 100;
                                const coresUsedPercent = (node.usedVirtualCores / totalCores) * 100;

                                return (
                                    <TableRow key={node.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{node.nodeHostName}</p>
                                                <p className="text-xs text-muted-foreground">{node.rack}</p>
                                            </div>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <Badge variant={getNodeStateVariant(node.state)}>
                                                {node.state}
                                            </Badge>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {assignedLabels.length > 0 ? (
                                                    assignedLabels.map((label) => (
                                                        <Badge
                                                            key={label}
                                                            variant={label === selectedLabel ? 'default' : 'outline'}
                                                        >
                                                            {label}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <Badge
                                                        variant={selectedLabel === null ? 'default' : 'outline'}
                                                    >
                                                        Default
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <div className="w-32 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <HardDrive className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-xs">
                                                        {formatMemory(node.usedMemoryMB)} / {formatMemory(totalMemory)}
                                                    </span>
                                                </div>
                                                <Progress 
                                                    value={memoryUsedPercent} 
                                                    className={`h-1 ${getUtilizationColor(node.usedMemoryMB, totalMemory)}`}
                                                />
                                            </div>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <div className="w-28 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Cpu className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-xs">
                                                        {node.usedVirtualCores} / {totalCores}
                                                    </span>
                                                </div>
                                                <Progress 
                                                    value={coresUsedPercent} 
                                                    className={`h-1 ${getUtilizationColor(node.usedVirtualCores, totalCores)}`}
                                                />
                                            </div>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <span className="text-sm">{node.numContainers}</span>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={assignedLabels[0] || 'default'}
                                                    onValueChange={(value) => handleLabelChange(node.id, value === 'default' ? null : value)}
                                                    disabled={isLoading}
                                                >
                                                    <SelectTrigger className="h-8 w-32">
                                                        <SelectValue placeholder="Select label" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="default">
                                                            <em>Default (no label)</em>
                                                        </SelectItem>
                                                        {nodeLabels.map((label) => (
                                                            <SelectItem key={label.name} value={label.name}>
                                                                <div className="flex items-center gap-2">
                                                                    {label.name}
                                                                    {label.exclusivity && (
                                                                        <Badge variant="outline" className="ml-2 h-5 border-warning text-warning">
                                                                            Exclusive
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                
                                                {assignedLabels.length > 0 && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleLabelChange(node.id, null)}
                                                                disabled={isLoading}
                                                            >
                                                                <X className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Remove label</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {filteredNodes.length === 0 && selectedLabel && (
                    <div className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            No nodes assigned to label "{selectedLabel}"
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Nodes without this label operate on the default partition where regular capacity values apply
                        </p>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
};