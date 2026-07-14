import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AppProvider } from '@/context/AppContext'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { FeedbackProvider } from '@/components/FeedbackProvider'
import { C } from '@/theme'
export default function RootLayout(){return <GestureHandlerRootView style={{flex:1}}><AppErrorBoundary><AppProvider><FeedbackProvider><StatusBar style="dark"/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:C.paper},animation:'slide_from_right'}}><Stack.Screen name="index" options={{animation:'fade'}}/><Stack.Screen name="auth"/><Stack.Screen name="rider" options={{animation:'fade'}}/><Stack.Screen name="data-center"/><Stack.Screen name="resilience-center"/><Stack.Screen name="order-chat/[id]"/><Stack.Screen name="receipt/[id]"/></Stack></FeedbackProvider></AppProvider></AppErrorBoundary></GestureHandlerRootView>}
