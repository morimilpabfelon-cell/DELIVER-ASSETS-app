import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AppProvider } from '@/context/AppContext'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { FeedbackProvider } from '@/components/FeedbackProvider'
import { C } from '@/theme'
export default function RootLayout(){return <GestureHandlerRootView style={{flex:1}}><AppErrorBoundary><FeedbackProvider><AppProvider><StatusBar style="dark"/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:C.paper},animation:'slide_from_right'}}><Stack.Screen name="index" options={{animation:'fade'}}/><Stack.Screen name="auth"/><Stack.Screen name="business" options={{animation:'fade'}}/><Stack.Screen name="data-center"/><Stack.Screen name="resilience-center"/><Stack.Screen name="business-profile"/><Stack.Screen name="product/[id]"/></Stack></AppProvider></FeedbackProvider></AppErrorBoundary></GestureHandlerRootView>}
