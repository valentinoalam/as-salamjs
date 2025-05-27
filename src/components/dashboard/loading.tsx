
//   if (loading) {
//     return (
//       <>
//         <Card className="animate-pulse">
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Pemasukan</CardTitle>
//             <TrendingUp className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="h-4 w-3/4 bg-muted rounded"></div>
//           </CardContent>
//         </Card>
//         <Card className="animate-pulse">
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Pengeluaran</CardTitle>
//             <TrendingDown className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="h-4 w-3/4 bg-muted rounded"></div>
//           </CardContent>
//         </Card>
//         <Card className="animate-pulse">
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Saldo</CardTitle>
//             <Wallet className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="h-4 w-3/4 bg-muted rounded"></div>
//           </CardContent>
//         </Card>
//         <Card className="animate-pulse">
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Tabungan</CardTitle>
//             <PiggyBank className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="h-4 w-3/4 bg-muted rounded"></div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardHeader className="pb-2">
//             <CardTitle className="text-xl">Total Pemasukan</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalIncome)}</div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardHeader className="pb-2">
//             <CardTitle className="text-xl">Total Pengeluaran</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="text-3xl font-bold text-red-600">{formatCurrency(stats.totalExpense)}</div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardHeader className="pb-2">
//             <CardTitle className="text-xl">Saldo</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className={`text-3xl font-bold ${stats.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
//               {formatCurrency(stats.balance)}
//             </div>
//           </CardContent>
//         </Card>
//       </>
//     );
//   }
