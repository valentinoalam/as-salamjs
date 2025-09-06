// import React, { useCallback, useMemo } from 'react'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { useQurban, type HewanQuery, type TipeHewan } from '@/hooks/qurban/use-qurban';
// import { 
//   Card, 
//   CardContent, 
//   CardDescription, 
//   CardHeader, 
//   CardTitle 
// } from '@/components/ui/card';
// import { Loader2 } from 'lucide-react';
// import { Button } from '@/components/ui/button';

// function QurbanStatus({ 
//   tipeHewan,
//   queryHewan,
//   currentPage,
//   setPage,
//   currentGroup
// }: ProgressProps) {
// 	const { meta, sapiQuery, dombaQuery } = useQurban();
// 	const { data: dombaData, isLoading, isError, refetch, pagination } = dombaQuery
//   return (
//     <Tabs defaultValue="sapi" className="w-full">
// 			<TabsList className="grid w-full grid-cols-2">
// 					<TabsTrigger value="sapi">Status Sapi</TabsTrigger>
// 					<TabsTrigger value="domba">Status Domba</TabsTrigger>
// 			</TabsList>
			
// 			<TabsContent value="sapi">
// 					<Card>
// 					<CardHeader>
// 							<CardTitle>Sapi</CardTitle>
// 							<CardDescription>
// 							Total: {totalSapi} ekor ({sapiData.filter(h => h.slaughtered).length} disembelih)
// 							</CardDescription>
// 					</CardHeader>
// 					<CardContent>
// 							<div className="grid grid-cols-5 gap-2">
// 							{sapiData.map((sapi) => (
// 									<div key={sapi.id} className="flex flex-col items-center justify-center p-2 border rounded-md">
// 									<span className="text-lg">🐮{sapi.hewanId}</span>
// 									<div className="flex flex-col items-center">
// 											<span className="text-2xl">
// 											{sapi.status === HewanStatus.DIDISTRIBUSI ? "✅" : 
// 											sapi.slaughtered ? "🔪" : "⬜️"}
// 											</span>
// 											<span className="text-xs mt-1">
// 											{sapi.meatPackageCount} paket
// 											</span>
// 									</div>
// 									</div>
// 							))}
// 							</div>
// 					</CardContent>
// 					</Card>
// 			</TabsContent>

// 			<TabsContent value="domba">
// 					<Card>
// 					<CardHeader>
// 							<CardTitle>Status Domba</CardTitle>
// 							<CardDescription>
// 							Total: {totalDomba} ekor ({dombaData.filter(h => h.slaughtered).length} disembelih)
// 							</CardDescription>
// 					</CardHeader>
// 					<CardContent>
// 							<div className="grid grid-cols-5 gap-2">
// 							{dombaData.map((domba) => (
// 									<div key={domba.id} className="flex flex-col items-center justify-center p-2 border rounded-md">
// 									<span className="text-lg">🐐{domba.hewanId}</span>
// 									<div className="flex flex-col items-center">
// 											<span className="text-2xl">
// 											{domba.status === HewanStatus.DIDISTRIBUSI ? "✅" : 
// 											domba.slaughtered ? "🔪" : "⬜️"}
// 											</span>
// 											<span className="text-xs mt-1">
// 											{domba.meatPackageCount} paket
// 											</span>
// 									</div>
// 									</div>
// 							))}
// 							</div>
// 					</CardContent>
// 					</Card>
// 			</TabsContent>
//     </Tabs>
//   )
// }

// export default QurbanStatus

// interface ProgressProps {
//   tipeHewan: TipeHewan
//   meta: {total: number; target: number};
//   queryHewan: HewanQuery;
//   currentPage: number; // Adjust type accordingly
//   setPage: (key: any, value: any) => void; // Adjust type accordingly
//   currentGroup?: string;
// }

// const StatusContent = ({ 
//   tipeHewan,
//   meta,
//   queryHewan,
//   currentPage,
//   setPage,
//   currentGroup
// }: ProgressProps) => {
//   const  { updateHewan } = useQurban()
//   const { data: pagedData, isLoading, isError, refetch, pagination } = queryHewan
//   const { useGroups, itemsPerGroup, pageSize, totalPages, totalGroups } = pagination;

//   const groupButtons = useMemo(() => 
//     Array.from(
//       { length: Math.ceil(meta.total / (itemsPerGroup || 50)) }, 
//       (_, i) => String.fromCharCode(65 + i)
//     ),
//     [meta.total, itemsPerGroup]
//   );

//   const handlePageChange = useCallback(
//     (page: number) => {
//       const pageKey = tipeHewan === 'sapi' ? 'sapiPage' : 'dombaPage';
//       setPage(pageKey, page);
//     },
//     [tipeHewan, setPage]
//   );

//   const handleGroupChange = useCallback(
//     (group: string) => {
//       const groupKey = tipeHewan === 'sapi' ? 'sapiGroup' : 'dombaGroup';
//       const pageKey = tipeHewan === 'sapi' ? 'sapiPage' : 'dombaPage';
      
//       setPage(groupKey, group);
//       setPage(pageKey, 1); // Reset to first page when group changes
//     },
//     [tipeHewan, setPage]
//   );

//   if (isLoading) {
//     return (
//       <Card>
//         <CardContent className="flex justify-center items-center py-8">
//           <Loader2 className="h-8 w-8 animate-spin" />
//           <span className="ml-2">Loading...</span>
//         </CardContent>
//       </Card>
//     )
//   }

//   if (isError) {
//     return (
//       <Card>
//         <CardContent className="text-center py-8">
//           <p className="text-red-500">Error loading data</p>
//           <Button 
//             onClick={() => refetch()}
//             className="mt-4"
//           >
//             Retry
//           </Button>
//         </CardContent>
//       </Card>
//     )
//   }

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Status {tipeHewan}</CardTitle>
// 				<CardDescription>
// 					Total: {meta.total} ekor ({meta.slaughtered} disembelih)
// 					</CardDescription>
//         {/* Pagination Controls */}
        
//         <div className="space-y-4">
//           { useGroups && totalGroups && totalGroups > 1 && (
//             <div className="flex gap-2 flex-wrap">
//               {groupButtons.map((group) => (
//                 <Button
//                   key={group}
//                   variant={currentGroup === group ? "default" : "outline"}
//                   onClick={() => handleGroupChange(group)}
//                   disabled={isLoading}
//                 >
//                   {group}
//                 </Button>
//               ))}
//             </div>
//           )}

//           <div className="flex gap-2 flex-wrap">
//             {Array.from({ length: totalPages }, (_, i) => {
//               const pageNum = i + 1
//               const start = i * pageSize + 1
//               const end = Math.min((i + 1) * pageSize, meta.total)

//               return (
//                 <Button
//                   key={pageNum}
//                   variant={currentPage === pageNum ? "default" : "outline"}
//                   onClick={() => handlePageChange(pageNum)}
//                   disabled={isLoading}
//                 >
//                   {start} - {end}
//                 </Button>
//               )
//             })}
//           </div>
//         </div>
//       </CardHeader>

//       <CardContent>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           {pagedData.map((hewan: HewanQurban) => (
//             <div
//               key={hewan.hewanId}
//               className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
//             >
//               <div className="flex items-center gap-4">
//                 <span className="text-2xl" aria-label={tipeHewan}>
//                   {tipeHewan === "sapi" ? "🐄" : "🐏"}
//                 </span>
//                 <span className="font-medium">{hewan.hewanId}</span>
//               </div>

//               <StatusSwitch
//                 label="Disembelih"
//                 checked={hewan.slaughtered}
//                 onCheckedChange={(checked) => handleSlaughteredChange(hewan.hewanId, checked, tipeHewan)}
//                 disabled={isUpdating === hewan.hewanId}
//               />
//             </div>
//           ))}
//         </div>
//       </CardContent>
//     </Card>
//   )
// }

// const StatusSwitch = ({
//   label,
//   checked,
//   onCheckedChange,
//   disabled = false,
// }: {
//   label: string
//   checked: boolean
//   onCheckedChange: (checked: boolean) => void
//   disabled?: boolean
// }) => (
//   <div className="flex items-center gap-2">
//     <Switch 
//       checked={checked} 
//       onCheckedChange={onCheckedChange} 
//       disabled={disabled} 
//     />
//     <Label className="text-sm select-none">
//       {checked ? `Sudah ${label}` : `Belum ${label}`}
//     </Label>
//   </div>
// )